// SPDX-License-Identifier: MIT
// Same native command SQL; one USER Connection owned by a dedicated thread.
#include "native_writer.hpp"
#include "native_writer_abi.h"
#include "duckdb/common/exception.hpp"
#include "duckdb/common/types/data_chunk.hpp"
#include "duckdb/common/types/value.hpp"
#include "duckdb/function/scalar_function.hpp"
#include "duckdb/main/client_context.hpp"
#include "duckdb/main/client_context_state.hpp"
#include "duckdb/main/connection.hpp"
#include "duckdb/main/database.hpp"
#include "duckdb/main/extension/extension_loader.hpp"
#include "duckdb/main/query_parameters.hpp"
#include "duckdb/main/query_result.hpp"
#include "duckdb/planner/expression/bound_parameter_data.hpp"
#include <atomic>
#include <chrono>
#include <cmath>
#include <condition_variable>
#include <cstring>
#include <deque>
#include <map>
#include <memory>
#include <mutex>
#include <optional>
#include <string>
#include <thread>
#include <vector>

namespace writer {
using Clock=std::chrono::steady_clock;
uint64_t ns(Clock::duration duration){return static_cast<uint64_t>(std::chrono::duration_cast<std::chrono::nanoseconds>(duration).count());}
struct Reply {
    td_writer_reply view{};
    std::string error;
    const char *emergency=nullptr;
    std::deque<std::string> strings;
    std::vector<td_writer_cell> cells;
    Reply(){view.abi=TD_WRITER_ABI;view.owner=this;}
    void set_error(const char *message,size_t length) noexcept {
        try{error.assign(message,length);}catch(...){emergency="Out of Memory Error: native writer error detail allocation failed";}
    }
    void set_error(const std::string &message) noexcept {set_error(message.data(),message.size());}
    void set_error(const char *message) noexcept {set_error(message,std::strlen(message));}
    td_writer_reply *finish(){view.error=emergency?emergency:error.data();view.error_length=emergency?std::strlen(emergency):error.size();
        view.cells=cells.data();return &view;}
};
void exception(Reply &reply,const std::exception &error) noexcept {
    try{duckdb::ErrorData data(error);reply.set_error(data.Message());reply.view.error_type=static_cast<int32_t>(data.Type());
        reply.view.fatal=duckdb::Exception::InvalidatesDatabase(data.Type());}
    catch(...){reply.set_error(error.what(),std::strlen(error.what()));reply.view.fatal=1;}
}
struct PortError:std::runtime_error {
    uint32_t code;
    PortError(uint32_t code,const char *message):std::runtime_error(message),code(code){}
};
td_writer_reply *error_reply(const char *message,int32_t type=0,bool fatal=false) noexcept {
    try{auto reply=std::make_unique<Reply>();reply->set_error(message);reply->view.error_type=type;reply->view.fatal=fatal;
        return reply.release()->finish();}catch(...){return nullptr;}
}
struct Executor;
struct Pending;
struct Factory {
    explicit Factory(duckdb::DatabaseInstance &database):database(database){}
    duckdb::DatabaseInstance &database; // DB owns functions; never own DB here.
    std::mutex mutex;
    std::weak_ptr<Pending> pending;
    std::weak_ptr<Executor> executor;
};
struct Pending {
    std::mutex mutex;
    duckdb::shared_ptr<duckdb::DatabaseInstance> anchor;
    std::shared_ptr<Factory> factory;
    std::atomic<bool> claimed{false};
    bool retired=false;
    Pending(duckdb::shared_ptr<duckdb::DatabaseInstance> db,std::shared_ptr<Factory> f)
        :anchor(std::move(db)),factory(std::move(f)){}
    void retire(){std::lock_guard<std::mutex> lock(mutex);if(!claimed.load()) {retired=true;anchor.reset();}}
};
struct PendingContext final:duckdb::ClientContextState {
    std::shared_ptr<Pending> pending;
    ~PendingContext() override {if(pending)pending->retire();}
    void QueryEnd(duckdb::ClientContext &,duckdb::optional_ptr<duckdb::ErrorData> error) override {
        if(error&&error->HasError()&&pending)pending->retire();
    }
};
// Only weak routing references. Creator context owns the unclaimed DB anchor.
std::mutex tickets_mutex;
std::map<uint64_t,std::weak_ptr<Pending>> tickets;
uint64_t next_ticket=0;
struct Job {
    std::string sql;
    duckdb::vector<duckdb::Value> parameters;
    td_writer_completion complete=nullptr;
    void *data=nullptr;
    Clock::time_point submitted=Clock::now();
};
struct Executor {
    duckdb::shared_ptr<duckdb::DatabaseInstance> anchor;
    std::shared_ptr<Factory> factory;
    std::mutex mutex;
    std::condition_variable changed;
    std::optional<Job> job;
    bool active=false,closing=false;
    std::atomic<bool> closed{false};
    td_writer_completion close_complete=nullptr;
    void *close_data=nullptr;
    std::unique_ptr<Reply> close_reply=std::make_unique<Reply>();
    std::unique_ptr<Reply> startup_reply=std::make_unique<Reply>();
    std::thread thread;
    explicit Executor(duckdb::shared_ptr<duckdb::DatabaseInstance> db,std::shared_ptr<Factory> f)
        :anchor(std::move(db)),factory(std::move(f)){}
    ~Executor(){if(thread.joinable())thread.join();}
    void start(){thread=std::thread([this]{run();});}
    static duckdb::Value parameter(const td_writer_cell &cell){
        switch(cell.tag){
        case TD_WRITER_NULL:return duckdb::Value();
        case TD_WRITER_BOOL:if(cell.integer==0||cell.integer==1)return duckdb::Value::BOOLEAN(cell.integer!=0);break;
        case TD_WRITER_I64:return duckdb::Value::BIGINT(cell.integer);
        case TD_WRITER_F64:if(std::isfinite(cell.floating))return duckdb::Value::DOUBLE(cell.floating==0?0:cell.floating);break;
        case TD_WRITER_TEXT:
            if((cell.text||!cell.length)&&cell.length<=1048576){
                std::string value(cell.text?cell.text:"",cell.length);
                if(value.find('\0')==std::string::npos)return duckdb::Value(value);
            }break;
        }
        throw duckdb::InvalidInputException("TD_E_CONTROL: invalid native writer parameter");
    }
    static void copy(Reply &reply,duckdb::QueryResult &result){
        // Generated PRAGMA expansion completes all statements. Copy its final
        // receipt result; reject any error in the complete result chain.
        auto *selected=&result;
        for(auto *part=&result;part;part=part->next.get()){
            part->ThrowIfError();selected=part;
        }
        reply.view.columns=selected->ColumnCount();
        size_t bytes=0;
        while(auto chunk=selected->Fetch()){
            for(duckdb::idx_t row=0;row<chunk->size();++row){
                if(reply.view.rows>=100000||(reply.view.rows+1)*reply.view.columns>800000)
                    throw PortError(1,"Native result admission exceeded");
                for(duckdb::idx_t col=0;col<chunk->ColumnCount();++col){
                    const auto value=chunk->GetValue(col,row);td_writer_cell cell{};
                    if(!value.IsNull())switch(value.type().id()){
                    case duckdb::LogicalTypeId::BOOLEAN:cell.tag=TD_WRITER_BOOL;cell.integer=value.GetValue<bool>();break;
                    case duckdb::LogicalTypeId::TINYINT:case duckdb::LogicalTypeId::SMALLINT:
                    case duckdb::LogicalTypeId::INTEGER:case duckdb::LogicalTypeId::BIGINT:
                    case duckdb::LogicalTypeId::UTINYINT:case duckdb::LogicalTypeId::USMALLINT:
                    case duckdb::LogicalTypeId::UINTEGER:case duckdb::LogicalTypeId::UBIGINT:
                        cell.tag=TD_WRITER_I64;cell.integer=value.GetValue<int64_t>();break;
                    case duckdb::LogicalTypeId::DOUBLE:case duckdb::LogicalTypeId::FLOAT:
                        cell.tag=TD_WRITER_F64;cell.floating=value.GetValue<double>();
                        if(!std::isfinite(cell.floating))throw PortError(2,"Unsupported native parameter");
                        break;
                    case duckdb::LogicalTypeId::VARCHAR:
                        cell.tag=TD_WRITER_TEXT;reply.strings.push_back(value.GetValue<std::string>());
                        cell.text=reply.strings.back().data();cell.length=reply.strings.back().size();
                        if(cell.length>1048576||reply.strings.back().find('\0')!=std::string::npos)
                            throw PortError(2,"Unsupported native parameter");
                        break;
                    default:throw PortError(2,"Unsupported native parameter");
                    }
                    bytes+=cell.tag==TD_WRITER_TEXT?cell.length:8;
                    if(bytes>16*1024*1024)throw PortError(1,"Native result byte admission exceeded");
                    reply.cells.push_back(cell);
                }
                ++reply.view.rows;
            }
        }
        for(auto *part=&result;part;part=part->next.get()){part->ThrowIfError();part->Close();}
    }
    void run() noexcept {
        duckdb::unique_ptr<duckdb::Connection> connection;
        auto &startup=*startup_reply;bool startup_failed=false;
        try{connection=duckdb::make_uniq<duckdb::Connection>(*anchor);}
        catch(const std::exception &error){startup_failed=true;exception(startup,error);}
        catch(...){startup_failed=true;startup.set_error("TD_E_CONTROL: native writer connection creation failed");}
        uint64_t sequence=0;
        for(;;){
            std::optional<Job> current;
            {std::unique_lock<std::mutex> lock(mutex);changed.wait(lock,[&]{return job.has_value()||closing;});
                if(!job)break;current=std::move(job);job.reset();active=true;}
            const auto started=Clock::now();std::unique_ptr<Reply> reply;bool copying=false;
            try{
                reply=std::make_unique<Reply>();reply->view.queue_ns=ns(started-current->submitted);
                reply->view.sequence=++sequence;
                if(startup_failed){
                    const auto *failure=startup.finish();reply->set_error(failure->error,failure->error_length);
                    reply->view.error_type=startup.view.error_type;reply->view.fatal=startup.view.fatal;
                }else{
                    reply->view.connection_id=connection->context->GetConnectionId();
                    duckdb::identifier_map_t<duckdb::BoundParameterData> parameters;
                    for(size_t index=0;index<current->parameters.size();++index)
                        parameters[duckdb::Identifier(std::to_string(index+1))]=duckdb::BoundParameterData(current->parameters[index]);
                    duckdb::QueryParameters query_parameters;
                    if(!parameters.empty())query_parameters.statement_args=parameters;
                    const auto sql_start=Clock::now();
                    auto result=connection->context->Query(current->sql,query_parameters);
                    reply->view.sql_ns=ns(Clock::now()-sql_start);
                    if(result->HasError()){
                        reply->set_error(result->GetError());reply->view.error_type=static_cast<int32_t>(result->GetErrorType());
                        reply->view.fatal=duckdb::Exception::InvalidatesDatabase(result->GetErrorType());result->Close();
                    }else{
                        const auto copy_start=Clock::now();copying=true;copy(*reply,*result);result.reset();copying=false;
                        reply->view.copy_ns=ns(Clock::now()-copy_start);
                    }
                }
            }catch(const PortError &error){
                if(reply){reply->set_error(error.what(),std::strlen(error.what()));reply->view.port_error=error.code;reply->view.uncertain=copying;}
            }catch(const std::exception &error){
                if(!reply){try{reply=std::make_unique<Reply>();}catch(...){}}
                if(reply){exception(*reply,error);reply->view.uncertain=copying;}
            }catch(...){if(reply)reply->set_error("TD_E_CONTROL: native writer execution failed");}
            {std::lock_guard<std::mutex> lock(mutex);active=false;}
            current->complete(current->data,reply?reply.release()->finish():nullptr);
        }
        // Worker owns Connection creation, use and destruction. No lock held.
        connection.reset();anchor.reset();closed.store(true,std::memory_order_release);
        if(close_complete){auto *reply=close_reply.release()->finish();reply->closed=1;close_complete(close_data,reply);}
    }
};
}
struct td_native_writer_handle {std::shared_ptr<writer::Executor> executor;};

void RegisterNativeWriter(duckdb::ExtensionLoader &loader,std::function<void(duckdb::ClientContext &)> validate){
    auto factory=std::make_shared<writer::Factory>(loader.GetDatabaseInstance());
    duckdb::ScalarFunction bootstrap(duckdb::Identifier("td_native_writer_bootstrap"),duckdb::vector<duckdb::LogicalType>{},duckdb::LogicalType::BIGINT,
        [factory,validate=std::move(validate)](duckdb::DataChunk &input,duckdb::ExpressionState &expression,duckdb::Vector &result){
            auto &context=expression.GetContext();validate(context);
            if(input.size()!=1)throw duckdb::InvalidInputException("TD_E_CONTROL: writer bootstrap requires one invocation");
            std::lock_guard<std::mutex> factory_lock(factory->mutex);
            auto old=factory->pending.lock();
            if((old&&!old->claimed.load())||!factory->executor.expired())
                throw duckdb::InvalidInputException("TD_E_CONTROL: instance already has a pending or live native writer");
            auto pending=std::make_shared<writer::Pending>(factory->database.shared_from_this(),factory);
            auto state=context.registered_state->GetOrCreate<writer::PendingContext>("temporal_native_writer_pending");
            if(state->pending)state->pending->retire();state->pending=pending;
            std::lock_guard<std::mutex> tickets_lock(writer::tickets_mutex);
            for(auto it=writer::tickets.begin();it!=writer::tickets.end();){
                if(it->second.expired())it=writer::tickets.erase(it);else ++it;
            }
            if(writer::next_ticket==INT64_MAX)throw duckdb::InvalidInputException("TD_E_CONTROL: writer ticket identity exhausted");
            const auto ticket=++writer::next_ticket;writer::tickets.emplace(ticket,pending);factory->pending=pending;
            result.SetValue(0,duckdb::Value::BIGINT(static_cast<int64_t>(ticket)));
        });
    bootstrap.SetVolatile();bootstrap.SetFallible();loader.RegisterFunction(std::move(bootstrap));
}

#define TD_WRITER_EXPORT extern "C" __attribute__((visibility("default")))
TD_WRITER_EXPORT int td_native_writer_claim_v1(uint64_t ticket,td_native_writer_handle **out,td_writer_reply **error) noexcept {
    if(out)*out=nullptr;if(error)*error=nullptr;
    try{
        if(!out||!error)throw duckdb::InvalidInputException("TD_E_CONTROL: invalid writer claim slots");
        std::shared_ptr<writer::Pending> pending;
        {std::lock_guard<std::mutex> lock(writer::tickets_mutex);auto found=writer::tickets.find(ticket);
            if(found==writer::tickets.end()||!(pending=found->second.lock()))
                throw duckdb::InvalidInputException("TD_E_CONTROL: stale or consumed writer ticket");
            writer::tickets.erase(found);}
        std::lock_guard<std::mutex> factory_lock(pending->factory->mutex);
        std::lock_guard<std::mutex> pending_lock(pending->mutex);
        if(pending->claimed.load()||pending->retired||!pending->anchor||!pending->factory->executor.expired())
            throw duckdb::InvalidInputException("TD_E_CONTROL: writer handoff retired or already claimed");
        auto executor=std::make_shared<writer::Executor>(pending->anchor,pending->factory);
        auto handle=std::make_unique<td_native_writer_handle>();handle->executor=executor;
        executor->start();pending->factory->executor=executor;pending->claimed.store(true);pending->anchor.reset();
        *out=handle.release();return 1;
    }catch(const std::exception &failure){if(error)*error=writer::error_reply(failure.what());return 0;}
     catch(...){if(error)*error=writer::error_reply("TD_E_CONTROL: writer claim failed");return 0;}
}
TD_WRITER_EXPORT int td_native_writer_submit_v1(td_native_writer_handle *handle,const char *sql,size_t length,
    const td_writer_cell *parameters,size_t count,td_writer_completion complete,void *data,td_writer_reply **error) noexcept {
    if(error)*error=nullptr;
    try{
        if(!handle||!complete||!error||!sql||!length||length>262144||count>1024||(!parameters&&count))
            throw duckdb::InvalidInputException("TD_E_CONTROL: invalid writer request");
        writer::Job job;job.sql.assign(sql,length);job.complete=complete;job.data=data;
        if(job.sql.find('\0')!=std::string::npos)throw duckdb::InvalidInputException("TD_E_CONTROL: NUL in writer SQL");
        for(size_t index=0;index<count;++index)job.parameters.push_back(writer::Executor::parameter(parameters[index]));
        auto &executor=*handle->executor;std::lock_guard<std::mutex> lock(executor.mutex);
        if(executor.closing||executor.active||executor.job)
            throw duckdb::InvalidInputException("TD_E_CONTROL: native writer is closed or overlaps another request");
        job.submitted=writer::Clock::now();executor.job=std::move(job);executor.changed.notify_one();return 1;
    }catch(const std::exception &failure){if(error)*error=writer::error_reply(failure.what());return 0;}
     catch(...){if(error)*error=writer::error_reply("TD_E_CONTROL: writer request admission failed");return 0;}
}
TD_WRITER_EXPORT int td_native_writer_close_v1(td_native_writer_handle *handle,td_writer_completion complete,
    void *data,td_writer_reply **error) noexcept {
    if(error)*error=nullptr;
    try{
        if(!handle||!error)throw duckdb::InvalidInputException("TD_E_CONTROL: invalid writer close");
        auto &executor=*handle->executor;std::lock_guard<std::mutex> lock(executor.mutex);
        if(executor.closing)throw duckdb::InvalidInputException("TD_E_CONTROL: writer close already requested");
        executor.closing=true;executor.close_complete=complete;executor.close_data=data;executor.changed.notify_one();return 1;
    }catch(const std::exception &failure){if(error)*error=writer::error_reply(failure.what());return 0;}
     catch(...){if(error)*error=writer::error_reply("TD_E_CONTROL: writer close failed");return 0;}
}
TD_WRITER_EXPORT void td_native_writer_reply_release_v1(td_writer_reply *reply) noexcept {
    if(reply)delete static_cast<writer::Reply *>(reply->owner);
}
TD_WRITER_EXPORT void td_native_writer_join_release_v1(td_native_writer_handle *handle) noexcept {
    if(!handle)return;
    auto &executor=*handle->executor;
    {std::lock_guard<std::mutex> lock(executor.mutex);executor.closing=true;executor.changed.notify_one();}
    if(executor.thread.joinable())executor.thread.join();delete handle;
}
