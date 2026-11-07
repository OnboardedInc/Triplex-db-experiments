// SPDX-License-Identifier: MIT
// Dedicated companion executor. uv_async is only an event-loop wakeup, never
// libuv worker-pool work. Every NAPI call is on the Node event-loop thread.
#include "native_writer_abi.h"
#include <node_api.h>
#include <uv.h>
#include <dlfcn.h>
#include <chrono>
#include <cmath>
#include <deque>
#include <memory>
#include <mutex>
#include <set>
#include <stdexcept>
#include <string>
#include <vector>

namespace {
void check(napi_status status){if(status!=napi_ok)throw std::runtime_error("TD_E_CONTROL: native writer Node conversion failed");}
std::string text(napi_env env,napi_value value,size_t limit){
    size_t length=0;check(napi_get_value_string_utf8(env,value,nullptr,0,&length));
    if(length>limit)throw std::runtime_error("TD_E_CONTROL: native writer text admission exceeded");
    std::string result(length+1,'\0');size_t copied=0;
    check(napi_get_value_string_utf8(env,value,result.data(),result.size(),&copied));result.resize(copied);
    if(result.find('\0')!=std::string::npos)throw std::runtime_error("TD_E_CONTROL: NUL in native writer text");return result;
}
struct Environment;
struct Job;
struct Handle {
    Environment *state;
    td_native_writer_handle *native=nullptr;
    bool external_live=true,closing=false;
    size_t jobs=0;
    Job *close_job=nullptr;
    napi_ref lifecycle_owner=nullptr;
};
struct Job {
    Environment *state;Handle *handle;
    napi_deferred promise=nullptr;napi_ref reference=nullptr;
    napi_async_context async_context=nullptr;
    napi_ref async_resource=nullptr;
    td_writer_reply *reply=nullptr;
    bool close=false;
    Job *next=nullptr;
    std::chrono::steady_clock::time_point posted{};
};
struct Environment {
    napi_env env;
    uv_async_t wake{};
    napi_async_cleanup_hook_handle cleanup=nullptr;
    bool closing=false,wake_closing=false;
    std::set<Handle *> handles;
    size_t pending=0;
    size_t async_contexts=0,async_resources=0,lifecycle_owners=0;
    std::mutex completed_mutex;
    Job *head=nullptr,*tail=nullptr;
    void *library=nullptr;std::string path,hash;
    td_writer_claim_fn claim=nullptr;td_writer_submit_fn submit=nullptr;td_writer_close_fn close=nullptr;
    td_writer_reply_release_fn reply_release=nullptr;td_writer_join_release_fn join_release=nullptr;
    explicit Environment(napi_env env):env(env){}
};
template<class T>T symbol(void *library,const char *name){
    auto address=dlsym(library,name);if(!address)throw std::runtime_error("TD_E_CONTROL: native writer ABI symbol missing");
    return reinterpret_cast<T>(address);
}
// Native completion: no NAPI, allocation, JS handle or engine work here.
void completed(void *data,td_writer_reply *reply){
    auto *job=static_cast<Job *>(data);auto *state=job->state;
    job->reply=reply;job->posted=std::chrono::steady_clock::now();
    {std::lock_guard<std::mutex> lock(state->completed_mutex);
        if(state->tail)state->tail->next=job;else state->head=job;state->tail=job;}
    (void)uv_async_send(&state->wake);
}
void retain_job(Environment *state,Handle *handle){
    ++state->pending;++handle->jobs;uv_ref(reinterpret_cast<uv_handle_t *>(&state->wake));
}
// Cleanup APIs below do not create JS values. The pinned Node24 implementation
// allows them during async environment cleanup (outside a GC finalizer).
void cleanup_check(napi_status status){
    if(status!=napi_ok)napi_fatal_error("temporal_writer",NAPI_AUTO_LENGTH,
        "native writer async scope/resource cleanup invariant failed",NAPI_AUTO_LENGTH);
}
void destroy_job_context(Job *job){
    auto *state=job->state;
    if(job->async_context){cleanup_check(napi_async_destroy(state->env,job->async_context));job->async_context=nullptr;--state->async_contexts;}
    if(job->async_resource){cleanup_check(napi_delete_reference(state->env,job->async_resource));job->async_resource=nullptr;--state->async_resources;}
    if(job->reference){cleanup_check(napi_delete_reference(state->env,job->reference));job->reference=nullptr;}
}
napi_value initialize_job(Job *job,napi_value external,const char *name){
    auto *state=job->state;napi_value promise=nullptr,resource=nullptr,resource_name=nullptr;
    try{
        check(napi_create_object(state->env,&resource));
        check(napi_create_reference(state->env,resource,1,&job->async_resource));++state->async_resources;
        check(napi_create_string_utf8(state->env,name,NAPI_AUTO_LENGTH,&resource_name));
        check(napi_async_init(state->env,resource,resource_name,&job->async_context));++state->async_contexts;
        check(napi_create_reference(state->env,external,1,&job->reference));
        check(napi_create_promise(state->env,&job->promise,&promise));return promise;
    }catch(...){destroy_job_context(job);job->promise=nullptr;throw;}
}
void release_lifecycle_owner(Handle *handle){
    if(handle->lifecycle_owner){
        cleanup_check(napi_delete_reference(handle->state->env,handle->lifecycle_owner));
        handle->lifecycle_owner=nullptr;--handle->state->lifecycle_owners;
    }
}
void delete_handle(Handle *handle){delete handle->close_job;delete handle;}
void request_close(Handle *handle){
    auto *state=handle->state;
    auto *job=handle->close_job;job->close=true;
    job->reply=nullptr;job->next=nullptr;
    retain_job(state,handle);handle->closing=true;
    td_writer_reply *error=nullptr;
    if(!state->close(handle->native,completed,job,&error))completed(job,error);
}
void maybe_finish(Environment *state){
    if(!state->closing){if(!state->pending)uv_unref(reinterpret_cast<uv_handle_t *>(&state->wake));return;}
    if(state->pending||state->wake_closing)return;
    for(auto *handle:state->handles)if(handle->native||handle->jobs)return;
    for(auto *handle:state->handles){handle->state=nullptr;if(!handle->external_live)delete_handle(handle);}
    state->handles.clear();state->wake_closing=true;
    uv_close(reinterpret_cast<uv_handle_t *>(&state->wake),[](uv_handle_t *wake){
        auto *state=static_cast<Environment *>(wake->data);
        if(state->library)dlclose(state->library);
        if(state->cleanup){(void)napi_remove_async_cleanup_hook(state->cleanup);state->cleanup=nullptr;}
        delete state;
    });
}
napi_value js_error(napi_env env,const std::string &message,bool fatal,const td_writer_reply *reply=nullptr){
    napi_value text_value=nullptr,error=nullptr,flag=nullptr;
    check(napi_create_string_utf8(env,message.data(),message.size(),&text_value));check(napi_create_error(env,nullptr,text_value,&error));
    check(napi_get_boolean(env,fatal,&flag));check(napi_set_named_property(env,error,"nativeWriterFatal",flag));
    check(napi_get_boolean(env,reply&&reply->uncertain,&flag));check(napi_set_named_property(env,error,"nativeWriterUncertain",flag));
    if(reply&&reply->port_error){napi_value code=nullptr;
        check(napi_create_string_utf8(env,reply->port_error==1?"RESULT_LIMIT":"PARAMETER",NAPI_AUTO_LENGTH,&code));
        check(napi_set_named_property(env,error,"nativeWriterPortCode",code));}
    return error;
}
napi_value response(napi_env env,const td_writer_reply &reply,uint64_t completion_ns){
    if(reply.abi!=TD_WRITER_ABI||reply.rows>100000||reply.columns>800000||reply.rows*reply.columns>800000)
        throw std::runtime_error("TD_E_CONTROL: malformed native writer result");
    napi_value answer=nullptr,rows=nullptr,metrics=nullptr;check(napi_create_object(env,&answer));
    check(napi_create_array_with_length(env,reply.rows,&rows));
    for(size_t row=0;row<reply.rows;++row){
        napi_value tuple=nullptr;check(napi_create_array_with_length(env,reply.columns,&tuple));
        for(size_t column=0;column<reply.columns;++column){
            const auto &cell=reply.cells[row*reply.columns+column];napi_value value=nullptr;
            switch(cell.tag){
            case TD_WRITER_NULL:check(napi_get_null(env,&value));break;
            case TD_WRITER_BOOL:check(napi_get_boolean(env,cell.integer!=0,&value));break;
            case TD_WRITER_I64:check(napi_create_bigint_int64(env,cell.integer,&value));break;
            case TD_WRITER_F64:check(napi_create_double(env,cell.floating,&value));break;
            case TD_WRITER_TEXT:check(napi_create_string_utf8(env,cell.text,cell.length,&value));break;
            default:throw std::runtime_error("TD_E_CONTROL: invalid native writer result tag");
            }
            check(napi_set_element(env,tuple,static_cast<uint32_t>(column),value));
        }
        check(napi_set_element(env,rows,static_cast<uint32_t>(row),tuple));
    }
    check(napi_create_object(env,&metrics));
    const uint64_t values[]={reply.queue_ns,reply.sql_ns,reply.copy_ns,completion_ns,reply.sequence,reply.connection_id};
    constexpr const char *names[]={"nativeQueueNs","sqlCallNs","copyAndCleanupNs","completionWaitNs","sequence","connectionId"};
    for(size_t index=0;index<6;++index){napi_value value=nullptr;check(napi_create_bigint_uint64(env,values[index],&value));
        check(napi_set_named_property(env,metrics,names[index],value));}
    check(napi_set_named_property(env,answer,"rows",rows));check(napi_set_named_property(env,answer,"metrics",metrics));return answer;
}
void wake(uv_async_t *async){
    auto *state=static_cast<Environment *>(async->data);Job *jobs=nullptr;
    {std::lock_guard<std::mutex> lock(state->completed_mutex);jobs=state->head;state->head=nullptr;state->tail=nullptr;}
    while(jobs){
        auto *job=jobs;jobs=job->next;auto *handle=job->handle;auto *reply=job->reply;
        napi_handle_scope handles=nullptr;
        // Cleanup-only jobs may still release an opaque lifecycle reference.
        // Keep a bounded handle scope even when environment teardown skips JS.
        cleanup_check(napi_open_handle_scope(state->env,&handles));
        if(job->close&&reply&&reply->closed){
            // Native close callback is emitted only AFTER Connection/anchor
            // retirement. Worker never waits for main-loop completion.
            state->join_release(handle->native);handle->native=nullptr;
            release_lifecycle_owner(handle);
        }else if(job->close)handle->closing=false;
        if(!state->closing&&job->promise){
            napi_callback_scope callback=nullptr;
            // Direct libuv callbacks have neither the implicit handle scope
            // nor async callback context of a normal JS->NAPI invocation.
            napi_value resource=nullptr;cleanup_check(napi_get_reference_value(state->env,job->async_resource,&resource));
            cleanup_check(napi_open_callback_scope(state->env,resource,job->async_context,&callback));
            try{
                napi_value settlement=nullptr;bool reject=false;
                if(!reply){td_writer_reply missing{};missing.uncertain=1;
                    settlement=js_error(state->env,"TD_E_CONTROL: native writer result allocation failed",false,&missing);reject=true;}
                else if(reply->error_length){settlement=js_error(state->env,std::string(reply->error,reply->error_length),reply->fatal!=0,reply);reject=true;}
                else{
                    const auto elapsed=std::chrono::duration_cast<std::chrono::nanoseconds>(std::chrono::steady_clock::now()-job->posted).count();
                    settlement=response(state->env,*reply,static_cast<uint64_t>(elapsed));
                }
                // Callback-scope closure may run promise continuations. Retire
                // native result bytes before exposing either ACK or rejection.
                if(reply){state->reply_release(reply);reply=nullptr;job->reply=nullptr;}
                check(reject?napi_reject_deferred(state->env,job->promise,settlement):
                    napi_resolve_deferred(state->env,job->promise,settlement));
            }catch(const std::exception &error){
                napi_value exception=nullptr;bool pending=false;
                if(napi_is_exception_pending(state->env,&pending)==napi_ok&&pending)(void)napi_get_and_clear_last_exception(state->env,&exception);
                td_writer_reply delivery{};delivery.uncertain=!job->close;
                if(reply){state->reply_release(reply);reply=nullptr;job->reply=nullptr;}
                try{check(napi_reject_deferred(state->env,job->promise,js_error(state->env,error.what(),false,&delivery)));}
                catch(...){cleanup_check(napi_generic_failure);}
            }
            cleanup_check(napi_close_callback_scope(state->env,callback));
            destroy_job_context(job);
        }else{
            // Internal finalizer/cleanup jobs never deliver JS and have no
            // async context. User jobs canceled by environment teardown still
            // destroy their context and strong refs on this main-loop path.
            destroy_job_context(job);
        }
        cleanup_check(napi_close_handle_scope(state->env,handles));
        if(reply)state->reply_release(reply);
        --state->pending;--handle->jobs;
        job->promise=nullptr;
        if(!job->close)delete job;
        if(!handle->external_live&&!handle->native&&!handle->jobs){state->handles.erase(handle);delete_handle(handle);}
    }
    maybe_finish(state);
}
void cleanup(napi_async_cleanup_hook_handle hook,void *data){
    auto *state=static_cast<Environment *>(data);state->cleanup=hook;state->closing=true;
    uv_ref(reinterpret_cast<uv_handle_t *>(&state->wake));
    for(auto *handle:state->handles)if(handle->native&&!handle->closing)request_close(handle);
    maybe_finish(state);
}
void finalize(napi_env,void *data,void *){
    auto *handle=static_cast<Handle *>(data);auto *state=handle->state;handle->external_live=false;
    if(!state){delete_handle(handle);return;}
    if(handle->native&&!handle->closing)request_close(handle);
    else if(!handle->native&&!handle->jobs){state->handles.erase(handle);delete_handle(handle);}
}
Environment *arguments(napi_env env,napi_callback_info info,size_t &count,napi_value *args){
    void *data=nullptr;check(napi_get_cb_info(env,info,&count,args,nullptr,&data));auto *state=static_cast<Environment *>(data);
    if(state->closing)throw std::runtime_error("TD_E_CONTROL: native writer environment is closing");return state;
}
Handle *get_handle(napi_env env,napi_value value,Environment *state){
    void *pointer=nullptr;check(napi_get_value_external(env,value,&pointer));
    auto *handle=static_cast<Handle *>(pointer);
    if(!state->handles.count(handle)||!handle->native||handle->closing) {
        throw std::runtime_error("TD_E_CONTROL: native writer handle is closed or not owned by this environment");
    }
    return handle;
}
napi_value initialize(napi_env env,napi_callback_info info){
    try{
        size_t count=2;napi_value args[2]{};auto *state=arguments(env,info,count,args);
        if(count!=2)throw std::runtime_error("TD_E_CONTROL: native writer requires companion path/hash");
        const auto path=text(env,args[0],4096),hash=text(env,args[1],64);
        if(path.empty()||hash.size()!=64||hash.find_first_not_of("0123456789abcdef")!=std::string::npos)
            throw std::runtime_error("TD_E_CONTROL: invalid native writer companion identity");
        if(state->library){if(state->path!=path||state->hash!=hash)throw std::runtime_error("TD_E_CONTROL: writer companion already pinned");}
        else{
            auto *library=dlopen(path.c_str(),RTLD_NOW|RTLD_LOCAL);
            if(!library)throw std::runtime_error("TD_E_CONTROL: unable to open paired writer companion");
            try{
                const auto claim=symbol<td_writer_claim_fn>(library,"td_native_writer_claim_v1");
                const auto submit=symbol<td_writer_submit_fn>(library,"td_native_writer_submit_v1");
                const auto close=symbol<td_writer_close_fn>(library,"td_native_writer_close_v1");
                const auto reply=symbol<td_writer_reply_release_fn>(library,"td_native_writer_reply_release_v1");
                const auto release=symbol<td_writer_join_release_fn>(library,"td_native_writer_join_release_v1");
                state->path=path;state->hash=hash;state->claim=claim;state->submit=submit;state->close=close;
                state->reply_release=reply;state->join_release=release;state->library=library;
            }catch(...){dlclose(library);throw;}
        }
        napi_value value=nullptr;check(napi_get_undefined(env,&value));return value;
    }catch(const std::exception &error){napi_throw_error(env,nullptr,error.what());return nullptr;}
}
napi_value claim(napi_env env,napi_callback_info info){
    try{
        size_t count=2;napi_value args[2]{};auto *state=arguments(env,info,count,args);uint64_t ticket=0;bool lossless=false;
        if(count!=2||!state->library)throw std::runtime_error("TD_E_CONTROL: writer claim requires bridge, ticket and opaque JS lifecycle owner");
        check(napi_get_value_bigint_uint64(env,args[0],&ticket,&lossless));
        if(!lossless||!ticket)throw std::runtime_error("TD_E_CONTROL: invalid writer ticket");
        auto owned=std::make_unique<Handle>(Handle{state});auto *handle=owned.get();
        auto close_job=std::make_unique<Job>(Job{state,handle});handle->close_job=close_job.get();
        state->handles.insert(handle);
        const auto retained=napi_create_reference(env,args[1],1,&handle->lifecycle_owner);
        if(retained!=napi_ok){state->handles.erase(handle);check(retained);}++state->lifecycle_owners;
        // Complete every NAPI allocation before starting a native Connection.
        // A failed External allocation must not leave an undisclosed executor
        // still retiring while the factory believes claim never happened.
        napi_value value=nullptr;const auto external=napi_create_external(env,handle,finalize,nullptr,&value);
        if(external!=napi_ok){release_lifecycle_owner(handle);state->handles.erase(handle);check(external);}
        close_job.release();owned.release();
        td_writer_reply *error=nullptr;
        if(!state->claim(ticket,&handle->native,&error)){
            release_lifecycle_owner(handle);
            const std::unique_ptr<td_writer_reply,td_writer_reply_release_fn> failure(error,state->reply_release);
            const auto message=error?std::string(error->error,error->error_length):"TD_E_CONTROL: writer claim failed";
            throw std::runtime_error(message);
        }
        return value;
    }catch(const std::exception &error){napi_throw_error(env,nullptr,error.what());return nullptr;}
}
napi_value run(napi_env env,napi_callback_info info){
    try{
        size_t count=3;napi_value args[3]{};auto *state=arguments(env,info,count,args);
        if(count!=3)throw std::runtime_error("TD_E_CONTROL: writer run requires handle, SQL and parameters");
        auto *handle=get_handle(env,args[0],state);const auto sql=text(env,args[1],262144);
        bool array=false;check(napi_is_array(env,args[2],&array));uint32_t length=0;
        if(!array)throw std::runtime_error("TD_E_CONTROL: writer parameters require an array");
        check(napi_get_array_length(env,args[2],&length));if(length>1024)throw std::runtime_error("TD_E_CONTROL: writer parameter admission exceeded");
        std::vector<td_writer_cell> cells;cells.reserve(length);std::deque<std::string> strings;
        napi_value null_value=nullptr;check(napi_get_null(env,&null_value));
        for(uint32_t index=0;index<length;++index){
            napi_value value=nullptr;check(napi_get_element(env,args[2],index,&value));td_writer_cell cell{};
            bool is_null=false;check(napi_strict_equals(env,value,null_value,&is_null));
            if(!is_null){
                napi_valuetype type{};check(napi_typeof(env,value,&type));
                if(type==napi_bigint){bool exact=false;check(napi_get_value_bigint_int64(env,value,&cell.integer,&exact));
                    if(!exact)throw std::runtime_error("TD_E_CONTROL: writer BIGINT out of range");cell.tag=TD_WRITER_I64;}
                else if(type==napi_boolean){bool boolean=false;check(napi_get_value_bool(env,value,&boolean));cell.tag=TD_WRITER_BOOL;cell.integer=boolean;}
                else if(type==napi_number){check(napi_get_value_double(env,value,&cell.floating));
                    if(!std::isfinite(cell.floating))throw std::runtime_error("TD_E_CONTROL: nonfinite writer parameter");cell.tag=TD_WRITER_F64;}
                else if(type==napi_string){strings.push_back(text(env,value,1048576));cell.tag=TD_WRITER_TEXT;cell.text=strings.back().data();cell.length=strings.back().size();}
                else throw std::runtime_error("TD_E_CONTROL: unsupported writer parameter");
            }
            cells.push_back(cell);
        }
        auto owned_job=std::make_unique<Job>(Job{state,handle});auto *job=owned_job.get();
        const auto promise=initialize_job(job,args[0],"TemporalNativeWriter.run");
        retain_job(state,handle);owned_job.release();td_writer_reply *error=nullptr;
        if(!state->submit(handle->native,sql.data(),sql.size(),cells.data(),cells.size(),completed,job,&error))completed(job,error);
        return promise;
    }catch(const std::exception &error){napi_throw_error(env,nullptr,error.what());return nullptr;}
}
napi_value close(napi_env env,napi_callback_info info){
    try{
        size_t count=1;napi_value args[1]{};auto *state=arguments(env,info,count,args);
        if(count!=1)throw std::runtime_error("TD_E_CONTROL: writer close requires handle");
        auto *handle=get_handle(env,args[0],state);
        const auto promise=initialize_job(handle->close_job,args[0],"TemporalNativeWriter.close");
        request_close(handle);return promise;
    }catch(const std::exception &error){napi_throw_error(env,nullptr,error.what());return nullptr;}
}
napi_value snapshot(napi_env env,napi_callback_info info){
    try{
        size_t count=0;auto *state=arguments(env,info,count,nullptr);size_t live=0;
        for(auto *handle:state->handles)if(handle->native)++live;
        napi_value value=nullptr,number=nullptr;check(napi_create_object(env,&value));
        check(napi_create_double(env,static_cast<double>(live),&number));check(napi_set_named_property(env,value,"liveHandles",number));
        check(napi_create_double(env,static_cast<double>(state->pending),&number));check(napi_set_named_property(env,value,"pendingCompletions",number));
        check(napi_create_double(env,static_cast<double>(state->async_contexts),&number));check(napi_set_named_property(env,value,"asyncContexts",number));
        check(napi_create_double(env,static_cast<double>(state->async_resources),&number));check(napi_set_named_property(env,value,"asyncResources",number));
        check(napi_create_double(env,static_cast<double>(state->lifecycle_owners),&number));check(napi_set_named_property(env,value,"lifecycleOwners",number));
        return value;
    }catch(const std::exception &error){napi_throw_error(env,nullptr,error.what());return nullptr;}
}
napi_value retired(napi_env env,napi_callback_info info){
    try{
        size_t count=1;napi_value args[1]{};auto *state=arguments(env,info,count,args);void *pointer=nullptr;
        if(count!=1)throw std::runtime_error("TD_E_CONTROL: retired check requires one opaque handle");
        check(napi_get_value_external(env,args[0],&pointer));auto *handle=static_cast<Handle *>(pointer);
        if(!state->handles.count(handle))throw std::runtime_error("TD_E_CONTROL: writer handle belongs to another environment");
        napi_value value=nullptr;check(napi_get_boolean(env,handle->native==nullptr,&value));return value;
    }catch(const std::exception &error){napi_throw_error(env,nullptr,error.what());return nullptr;}
}
napi_value module(napi_env env,napi_value exports){
    auto *state=new Environment(env);state->wake.data=state;uv_loop_t *loop=nullptr;
    if(napi_get_uv_event_loop(env,&loop)!=napi_ok||uv_async_init(loop,&state->wake,wake)!=0){delete state;return nullptr;}
    uv_unref(reinterpret_cast<uv_handle_t *>(&state->wake));
    if(napi_add_async_cleanup_hook(env,cleanup,state,&state->cleanup)!=napi_ok){
        uv_close(reinterpret_cast<uv_handle_t *>(&state->wake),[](uv_handle_t *handle){delete static_cast<Environment *>(handle->data);});return nullptr;
    }
    const napi_property_descriptor methods[]={
        {"initialize",nullptr,initialize,nullptr,nullptr,nullptr,napi_default,state},
        {"claim",nullptr,claim,nullptr,nullptr,nullptr,napi_default,state},
        {"run",nullptr,run,nullptr,nullptr,nullptr,napi_default,state},
        {"close",nullptr,close,nullptr,nullptr,nullptr,napi_default,state},
        {"snapshot",nullptr,snapshot,nullptr,nullptr,nullptr,napi_default,state},
        {"retired",nullptr,retired,nullptr,nullptr,nullptr,napi_default,state},
    };
    if(napi_define_properties(env,exports,sizeof(methods)/sizeof(methods[0]),methods)!=napi_ok)return nullptr;return exports;
}
}
NAPI_MODULE(temporal_writer,module)
