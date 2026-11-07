// SPDX-License-Identifier: MIT
// Thin Node-API bridge to the extension's invocation controls. No store semantics.
#include <node_api.h>
#include <dlfcn.h>
#include <cmath>
#include <cstdint>
#include <mutex>
#include <stdexcept>
#include <string>

namespace {
void check(napi_status status){if(status!=napi_ok)throw std::runtime_error("TD_E_CONTROL: Node-API conversion failed");}
std::string text(napi_env env,napi_value value,size_t cap){
    size_t size=0;check(napi_get_value_string_utf8(env,value,nullptr,0,&size));
    if(!size||size>cap)throw std::runtime_error("TD_E_CONTROL: invalid bridge identity");
    std::string result(size+1,'\0');size_t copied=0;check(napi_get_value_string_utf8(env,value,result.data(),result.size(),&copied));
    result.resize(copied);if(result.find('\0')!=std::string::npos)throw std::runtime_error("TD_E_CONTROL: NUL in bridge identity");return result;
}
struct Bridge{
    std::mutex mutex;void *library=nullptr;std::string path,hash;
    int64_t (*create)(uint64_t)=nullptr;
    int64_t (*unbounded)()=nullptr;
    int (*cancel)(int64_t)=nullptr;
    int (*status)(int64_t)=nullptr;
    void (*release)(int64_t)=nullptr;
#if TD_EVALUATOR_PROFILE
    int64_t (*create_profiled)(uint64_t)=nullptr;
    int (*read_profile)(int64_t,uint64_t*,size_t)=nullptr;
#endif
} bridge;
template<class T>T symbol(void *library,const char *name){
    const auto value=dlsym(library,name);
    if(!value)throw std::runtime_error("TD_E_CONTROL: required invocation symbol is unavailable");
    return reinterpret_cast<T>(value);
}
napi_value initialize(napi_env env,napi_callback_info info) noexcept{
    try{
        size_t count=2;napi_value args[2]{};check(napi_get_cb_info(env,info,&count,args,nullptr,nullptr));
        if(count!=2)throw std::runtime_error("TD_E_CONTROL: bridge requires artifact path/hash");
        const auto path=text(env,args[0],4096),hash=text(env,args[1],64);
        if(hash.size()!=64||hash.find_first_not_of("0123456789abcdef")!=std::string::npos)
            throw std::runtime_error("TD_E_CONTROL: invalid artifact hash");
        std::lock_guard<std::mutex> lock(bridge.mutex);
        if(bridge.library){
            if(bridge.path!=path||bridge.hash!=hash)throw std::runtime_error("TD_E_CONTROL: bridge artifact is already pinned");
        }else{
            auto *library=dlopen(path.c_str(),RTLD_NOW|RTLD_LOCAL);
            if(!library)throw std::runtime_error("TD_E_CONTROL: unable to open pinned extension");
            try{
                const auto create=symbol<decltype(bridge.create)>(library,"td_control_create");
                const auto unbounded=symbol<decltype(bridge.unbounded)>(library,"td_control_create_unbounded");
                const auto cancel=symbol<decltype(bridge.cancel)>(library,"td_control_cancel");
                const auto status=symbol<decltype(bridge.status)>(library,"td_control_status");
                const auto release=symbol<decltype(bridge.release)>(library,"td_control_release");
#if TD_EVALUATOR_PROFILE
                const auto create_profiled=symbol<decltype(bridge.create_profiled)>(library,"td_control_create_profiled_v1");
                const auto read_profile=symbol<decltype(bridge.read_profile)>(library,"td_control_evaluator_profile_v1");
                bridge.create_profiled=create_profiled;bridge.read_profile=read_profile;
#endif
                bridge.path=path;bridge.hash=hash;bridge.create=create;bridge.unbounded=unbounded;
                bridge.cancel=cancel;bridge.status=status;bridge.release=release;bridge.library=library;
                // One pinned loader reference for process lifetime. Tokens have
                // explicit scoped release; no unbounded image/handle cache.
            }catch(...){dlclose(library);throw;}
        }
        napi_value result=nullptr;check(napi_get_undefined(env,&result));return result;
    }catch(const std::exception &e){napi_throw_error(env,nullptr,e.what());return nullptr;}
     catch(...){napi_throw_error(env,nullptr,"TD_E_CONTROL: bridge initialization failed");return nullptr;}
}
napi_value operation(napi_env env,napi_callback_info info) noexcept{
    try{
        size_t count=1;napi_value args[1]{};void *data=nullptr;check(napi_get_cb_info(env,info,&count,args,nullptr,&data));
        if(count!=1)throw std::runtime_error("TD_E_CONTROL: invocation argument required");
        const auto mode=reinterpret_cast<uintptr_t>(data);std::lock_guard<std::mutex> lock(bridge.mutex);
        if(!bridge.library)throw std::runtime_error("TD_E_CONTROL: bridge is not initialized");
        napi_value result=nullptr;
#if TD_EVALUATOR_PROFILE
        const bool profiled=mode==4;
#else
        constexpr bool profiled=false;
#endif
        if(mode==0||profiled){
            napi_valuetype type{};check(napi_typeof(env,args[0],&type));int64_t token=0;
            if(type==napi_undefined){
                if(profiled)throw std::runtime_error("TD_E_CONTROL: profiled invocation requires a duration");
                token=bridge.unbounded();
            }
            else{
                double millis=0;check(napi_get_value_double(env,args[0],&millis));
                if(!std::isfinite(millis)||millis<1||millis>3600000||std::floor(millis)!=millis)
                    throw std::runtime_error("TD_E_CONTROL: invalid invocation duration");
#if TD_EVALUATOR_PROFILE
                if(profiled)token=bridge.create_profiled(static_cast<uint64_t>(millis));
                else
#endif
                token=bridge.create(static_cast<uint64_t>(millis));
            }
            if(token<=0)throw std::runtime_error("TD_E_CONTROL: invocation admission exceeded");
            const auto status=napi_create_bigint_int64(env,token,&result);
            if(status!=napi_ok){bridge.release(token);check(status);}return result;
        }
        int64_t token=0;bool lossless=false;check(napi_get_value_bigint_int64(env,args[0],&token,&lossless));
        if(!lossless||token<=0)throw std::runtime_error("TD_E_CONTROL: invalid invocation token");
#if TD_EVALUATOR_PROFILE
        if(mode==5){
            constexpr const char *fields[]={"buildAndLoadNs","fixedPointNs","materializeAnswerNs",
                "encodeResultVectorNs","inputRows","answerRows"};
            constexpr size_t field_count=sizeof(fields)/sizeof(fields[0]);
            uint64_t sample[field_count]{};
            if(!bridge.read_profile(token,sample,field_count)){check(napi_get_null(env,&result));return result;}
            check(napi_create_object(env,&result));
            for(size_t i=0;i<field_count;++i){
                napi_value value=nullptr;check(napi_create_bigint_uint64(env,sample[i],&value));
                check(napi_set_named_property(env,result,fields[i],value));
            }
            return result;
        }
#endif
        if(mode==1){if(!bridge.cancel(token))throw std::runtime_error("TD_E_CONTROL: invocation is retired");}
        else if(mode==2){check(napi_create_int32(env,bridge.status(token),&result));return result;}
        else bridge.release(token);
        check(napi_get_undefined(env,&result));return result;
    }catch(const std::exception &e){napi_throw_error(env,nullptr,e.what());return nullptr;}
     catch(...){napi_throw_error(env,nullptr,"TD_E_CONTROL: invocation bridge failed");return nullptr;}
}
napi_value module(napi_env env,napi_value exports){
    const napi_property_descriptor methods[]={
        {"initialize",nullptr,initialize,nullptr,nullptr,nullptr,napi_default,nullptr},
        {"create",nullptr,operation,nullptr,nullptr,nullptr,napi_default,reinterpret_cast<void*>(0)},
        {"cancel",nullptr,operation,nullptr,nullptr,nullptr,napi_default,reinterpret_cast<void*>(1)},
        {"status",nullptr,operation,nullptr,nullptr,nullptr,napi_default,reinterpret_cast<void*>(2)},
        {"release",nullptr,operation,nullptr,nullptr,nullptr,napi_default,reinterpret_cast<void*>(3)},
#if TD_EVALUATOR_PROFILE
        {"createProfiled",nullptr,operation,nullptr,nullptr,nullptr,napi_default,reinterpret_cast<void*>(4)},
        {"readEvaluatorProfile",nullptr,operation,nullptr,nullptr,nullptr,napi_default,reinterpret_cast<void*>(5)},
#endif
    };
    if(napi_define_properties(env,exports,sizeof(methods)/sizeof(methods[0]),methods)!=napi_ok)return nullptr;
    return exports;
}
}
NAPI_MODULE(temporal_control,module)
