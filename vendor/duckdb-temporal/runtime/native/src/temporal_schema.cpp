// SPDX-License-Identifier: MIT
#include "temporal_schema.hpp"
#include "temporal_value_domain.hpp"
#include "temporal_sql.hpp"
#include "temporal_integrity.hpp"
#include "temporal_uniqueness.hpp"
#include "temporal_presence.hpp"
#include <charconv>
#include <optional>
#include <set>

namespace td::schema {
namespace {
[[noreturn]] void error(const char *code, const std::string &detail) {
    throw Error(std::string("TD_E_SCHEMA_") + code + ": " + detail);
}
std::string json(std::string_view value) {
    constexpr char digits[] = "0123456789abcdef";
    std::string out = "\"";
    for (const unsigned char c : value) {
        if (c == '"' || c == '\\') { out += '\\'; out += static_cast<char>(c); }
        else if (c < 32) { out += "\\u00"; out += digits[c >> 4]; out += digits[c & 15]; }
        else out += static_cast<char>(c);
    }
    return out + '"';
}
std::string blob_metadata(std::string_view id,std::string_view mime,int64_t size,
        const std::optional<std::string> &filename) {
    if (id.empty() || id.size()>512 || mime.empty() || size<0 || size>9007199254740991LL)
        error("BLOB","invalid blob ID, MIME type or safe byte size");
    return "{\"mimeType\":"+json(mime)+",\"size\":"+std::to_string(size)+
        (filename?",\"filename\":"+json(*filename):"")+'}';
}
std::string blob_payload(std::string_view id,const std::string &metadata) {
    return "{\"id\":"+json(id)+','+metadata.substr(1);
}
struct Parser {
    const std::string_view source;
    size_t pos = 0;
    explicit Parser(std::string_view s, size_t max) : source(s) {
        if (s.empty() || s.size() > max) error("LIMIT", "input byte admission exceeded");
        if (s.find('\0') != std::string::npos) error("SYNTAX", "NUL in input");
    }
    static bool letter(char c) { return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_'; }
    static bool digit(char c) { return c >= '0' && c <= '9'; }
    void space() { while (pos < source.size() && (source[pos]==' ' || source[pos]=='\n' || source[pos]=='\r' || source[pos]=='\t')) ++pos; }
    bool take(char c) { space(); if (pos < source.size() && source[pos] == c) { ++pos; return true; } return false; }
    void need(char c) { if (!take(c)) error("SYNTAX", std::string("expected '") + c + "' at byte " + std::to_string(pos)); }
    std::string identifier() {
        space(); const auto begin = pos;
        if (pos == source.size() || !letter(source[pos])) error("SYNTAX", "expected identifier at byte " + std::to_string(pos));
        while (pos < source.size() && (letter(source[pos]) || digit(source[pos]))) ++pos;
        if (pos - begin > 64) error("LIMIT", "identifier exceeds 64 bytes");
        return std::string(source.substr(begin, pos-begin));
    }
    void keyword(const char *word) { if (identifier() != word) error("SYNTAX", std::string("expected ") + word); }
    uint32_t hex(size_t digits) {
        uint32_t result = 0;
        for (size_t n=0; n<digits; ++n) {
            if (pos == source.size()) error("SYNTAX", "truncated Unicode escape");
            const auto c = source[pos++];
            const auto v = c>='0'&&c<='9' ? c-'0' : c>='a'&&c<='f' ? c-'a'+10 : c>='A'&&c<='F' ? c-'A'+10 : -1;
            if (v < 0) error("SYNTAX", "invalid hexadecimal digit");
            result = (result << 4) | static_cast<uint32_t>(v);
        }
        return result;
    }
    static void utf8(std::string &out, uint32_t point) {
        if (point <= 0x7f) out += static_cast<char>(point);
        else if (point <= 0x7ff) { out += static_cast<char>(0xc0 | (point >> 6)); out += static_cast<char>(0x80 | (point & 63)); }
        else if (point <= 0xffff) { out += static_cast<char>(0xe0 | (point >> 12)); out += static_cast<char>(0x80 | ((point >> 6) & 63)); out += static_cast<char>(0x80 | (point & 63)); }
        else { out += static_cast<char>(0xf0 | (point >> 18)); out += static_cast<char>(0x80 | ((point >> 12) & 63)); out += static_cast<char>(0x80 | ((point >> 6) & 63)); out += static_cast<char>(0x80 | (point & 63)); }
    }
    std::string string() {
        need('"'); std::string out;
        while (pos < source.size()) {
            auto c = source[pos++];
            if (c == '"') { detail::validate_typed_text(out); return out; }
            if (static_cast<unsigned char>(c) < 32) error("SYNTAX", "unescaped control character");
            if (c != '\\') out += c;
            else {
                if (pos == source.size()) error("SYNTAX", "truncated escape");
                c = source[pos++];
                switch (c) {
                case '"': case '\\': case '/': out += c; break;
                case 'n': out += '\n'; break; case 'r': out += '\r'; break; case 't': out += '\t'; break;
                case 'b': out += '\b'; break; case 'f': out += '\f'; break;
                case 'u': {
                    auto point = hex(4);
                    if (point >= 0xd800 && point <= 0xdbff) {
                        if (pos+2 > source.size() || source[pos]!='\\' || source[pos+1]!='u') error("SYNTAX", "missing low surrogate");
                        pos += 2; const auto low = hex(4);
                        if (low < 0xdc00 || low > 0xdfff) error("SYNTAX", "invalid low surrogate");
                        point = 0x10000 + ((point-0xd800) << 10) + low-0xdc00;
                    } else if (point >= 0xdc00 && point <= 0xdfff) error("SYNTAX", "isolated low surrogate");
                    utf8(out, point); break;
                }
                default: error("SYNTAX", "unsupported escape");
                }
            }
            if (out.size() > 16384) error("LIMIT", "string exceeds 16384 bytes");
        }
        error("SYNTAX", "unterminated string");
    }
    int64_t integer() {
        space(); const auto begin = pos;
        if (pos < source.size() && source[pos] == '-') ++pos;
        const auto digits = pos;
        while (pos < source.size() && digit(source[pos])) ++pos;
        int64_t result = 0;
        const auto parsed = std::from_chars(source.data()+begin,source.data()+pos,result);
        if (digits == pos || parsed.ec != std::errc{} || parsed.ptr != source.data()+pos) error("VALUE", "invalid int64 literal");
        return result;
    }
    std::string key() {
        space(); auto result = pos < source.size() && source[pos]=='"' ? string() : identifier();
        if (result.empty() || result.size()>128) error("LIMIT", "attribute key must contain 1..128 bytes");
        return result;
    }
    void end() { space(); if (pos != source.size()) error("SYNTAX", "unexpected trailing input"); }
    Value value(bool expanded,std::string &blob_extra) {
        space();
        if (pos < source.size() && source[pos]=='"') return Value::str(string());
        if (pos < source.size() && (digit(source[pos]) || source[pos]=='-')) return Value::i64(integer());
        const auto kind = identifier();
        if (kind == "true" || kind == "false") return Value::boolean(kind == "true");
        need('(');
        if (kind == "i64") { const auto result = integer(); need(')'); return Value::i64(result); }
        if (expanded && kind == "ref") {
            auto id = string(); need(')'); return Value::ref(std::move(id));
        }
        if (expanded && kind == "json") {
            auto serialized=string();need(')');
            try { return Value::json(std::move(serialized)); }
            catch (const Error &e) { error("VALUE",e.what()); }
        }
        if (expanded && kind == "blob") {
            auto id=string();need(',');const auto mime=string();need(',');const auto size=integer();
            std::optional<std::string> filename;
            if (take(',')) filename=string();
            need(')');
            blob_extra=blob_metadata(id,mime,size,filename);
            return Value::blob(std::move(id));
        }
        if (kind == "f64" || (expanded && kind == "datetime")) {
            const auto bits = string(); need(')');
            if (bits.size() != 16) error("VALUE", kind + " requires 16 hexadecimal digits");
            uint64_t raw = 0; const auto parsed = std::from_chars(bits.data(),bits.data()+bits.size(),raw,16);
            if (parsed.ec != std::errc{} || parsed.ptr != bits.data()+bits.size()) error("VALUE", "invalid " + kind + " bits");
            if (kind == "datetime" && !detail::finite_float_bits(raw)) error("VALUE", "datetime must be finite");
            const auto number = detail::bits_float(raw);
            return kind == "f64" ? Value::f64(number) : Value::datetime(number);
        }
        error("VALUE", "unsupported literal constructor");
    }
};
struct ValueLess { bool operator()(const Value &a,const Value &b) const { return compare_values(a,b)<0; } };
}

Definition compile(const std::string &dsl, bool expanded) {
    Parser parser(dsl,16384); Definition result;
    parser.keyword("schema"); result.name = parser.identifier(); parser.keyword("version"); result.version = parser.integer();
    if (result.version<1 || result.version>2147483647) error("VERSION", "version must be in 1..2147483647");
    parser.need('{'); size_t fields = 0;
    while (!parser.take('}')) {
        if (result.entities.size()>=32) error("LIMIT", "more than 32 entities");
        parser.keyword("entity"); const auto name = parser.identifier(); Entity entity;
        if (!parser.take('{')) {
            if (!expanded) error("SYNTAX", "entity modifier requires the expanded schema entrypoint");
            parser.keyword("live");
            entity.live = true;
            result.live_entities = true;
            parser.need('{');
        }
        while (!parser.take('}')) {
            if (entity.attributes.size()>=64 || ++fields>1024) error("LIMIT", "attribute admission exceeded");
            const auto key = parser.key(); parser.need(':'); const auto type = parser.identifier();
            Attribute attribute{ValueTag::String};
            if (type=="text") attribute.tag=ValueTag::String;
            else if (type=="boolean") attribute.tag=ValueTag::Boolean;
            else if (type=="int64") attribute.tag=ValueTag::Int64;
            else if (type=="float64") attribute.tag=ValueTag::Float64;
            else if (expanded && type=="datetime") attribute.tag=ValueTag::DateTime;
            else if (expanded && type=="json") attribute.tag=ValueTag::Json;
            else if (expanded && type=="blob") attribute.tag=ValueTag::Blob;
            else if (type=="ref" || (expanded && type=="ref_value")) {
                if (type=="ref_value") attribute.tag=ValueTag::Reference;
                parser.need('(');attribute.reference=parser.identifier();parser.need(')');
            }
            else error("TYPE", "unsupported type: " + type);
            if (attribute.tag>ValueTag::Float64) result.expanded_values=true;
            if (attribute.tag==ValueTag::Json || attribute.tag==ValueTag::Blob) result.document_values=true;
            bool required = false, cardinality = false;
            while (!parser.take(';')) {
                const auto modifier = parser.identifier();
                if (modifier=="required" && !required) { attribute.required=true; required=true; }
                else if ((modifier=="one" || modifier=="many") && !cardinality) { attribute.many=modifier=="many"; cardinality=true; }
                else if (expanded && modifier=="unique" && !attribute.unique) { attribute.unique=true; result.unique_values=true; }
                else error("SYNTAX", "unknown or repeated modifier: " + modifier);
            }
            if (!entity.attributes.emplace(key,attribute).second) error("DUPLICATE", "duplicate attribute: " + key);
        }
        if (!result.entities.emplace(name,std::move(entity)).second) error("DUPLICATE", "duplicate entity: " + name);
    }
    parser.end(); if (result.entities.empty()) error("SYNTAX", "schema must declare an entity");
    for(const auto &[name,entity]:result.entities)for(const auto &[key,attribute]:entity.attributes)
        if(!attribute.reference.empty()&&!result.entities.count(attribute.reference))
            error("REFERENCE","unknown reference target type: "+attribute.reference+" at "+name+"."+key);
    return result;
}
std::string canonical_json(const Definition &schema) {
    std::string out = "{\"format\":"+json(schema.live_entities ? "td.schema/4" : schema.unique_values ? "td.schema/3" :
            schema.expanded_values ? "td.schema/2" : "td.schema/1")+
        ",\"name\":"+json(schema.name)+",\"version\":"+std::to_string(schema.version)+",\"entities\":[";
    bool first_entity = true;
    for (const auto &[name,entity] : schema.entities) {
        if (!first_entity) out += ',';
        first_entity=false; out += "{\"name\":"+json(name);
        if (entity.live) out += ",\"live\":true";
        out += ",\"attributes\":["; bool first = true;
        for (const auto &[key,attribute] : entity.attributes) {
            if (!first) out += ',';
            first=false; out += "{\"key\":"+json(key)+",\"tag\":"+std::to_string(static_cast<unsigned>(attribute.tag))+
                ",\"required\":"+(attribute.required?"true":"false")+",\"many\":"+(attribute.many?"true":"false");
            if(!attribute.reference.empty())out+=",\"reference\":"+json(attribute.reference);
            if(attribute.unique)out+=",\"unique\":true";
            out+='}';
        }
        out += "]}";
    }
    return out+"]}";
}
std::string references_json(const Definition &schema){
    std::string out="[";bool first=true;
    for(const auto &[name,entity]:schema.entities)for(const auto &[key,attribute]:entity.attributes)if(!attribute.reference.empty()){
        if(!first)out+=',';first=false;
        out+="{\"entity\":"+json(name)+",\"attribute\":"+json(key)+",\"target\":"+json(attribute.reference)+"}";
    }
    return out+']';
}
std::string registration_sql(const Definition &schema,const std::string &dsl) {
    const auto ir = canonical_json(schema);
    const auto sql=td::sql::literal;
    std::string upgrade;
    if(schema.expanded_values||schema.unique_values||schema.live_entities){
        // DuckDB cannot replace a CHECK constraint in place. Rebuild only
        // the small metadata tables inside the registration transaction.
        upgrade="CREATE TEMP TABLE __td_schema_owner_guard AS "+td::integrity::owner_check_sql()+";";
        if(schema.unique_values||schema.live_entities)upgrade+=R"TD_UPGRADE(
DELETE FROM __td_schema_owner_guard WHERE CASE
 WHEN (SELECT count(*) FROM td_catalog_v1.catalog_revision WHERE singleton AND revision IN(2,3))=1 THEN FALSE
 ELSE error('TD_E_COMMAND_FORMAT: native schema constraints require td_migrate_native_catalog_v2') END;
)TD_UPGRADE";
        upgrade+="CREATE TEMP TABLE __td_schema_format AS SELECT greatest(version,"+
            std::string(schema.live_entities?"11":schema.unique_values?"10":schema.document_values?"9":"8")+") version FROM main.store_meta;"+R"TD_UPGRADE(
CREATE TEMP TABLE __td_schema_upgrade AS SELECT name,version,dsl,ir,content_hash FROM td_catalog_v1.schemas;
DROP TABLE td_catalog_v1.schemas;
CREATE TABLE td_catalog_v1.schemas(
 name VARCHAR NOT NULL,version INTEGER NOT NULL CHECK(version>0),
 dsl VARCHAR NOT NULL CHECK(octet_length(encode(dsl)) BETWEEN 1 AND 16384),
 ir VARCHAR NOT NULL CHECK(json_valid(ir)),content_hash VARCHAR NOT NULL CHECK(content_hash=sha256(ir)),
 CHECK((json_extract_string(ir,'$.format') IN('td.schema/1','td.schema/2','td.schema/3','td.schema/4') AND json_extract_string(ir,'$.name')=name
  AND TRY_CAST(json_extract(ir,'$.version') AS INTEGER)=version) IS TRUE),
 PRIMARY KEY(name,version)
);
INSERT INTO td_catalog_v1.schemas SELECT * FROM __td_schema_upgrade;
DROP TABLE __td_schema_upgrade;
DROP TABLE main.store_meta;
CREATE TABLE main.store_meta(version INTEGER PRIMARY KEY CHECK(version IN(5,6,8,9,10,11)));
INSERT INTO main.store_meta SELECT version FROM __td_schema_format;
DROP TABLE __td_schema_format;
DROP TABLE __td_schema_owner_guard;
)TD_UPGRADE";
    }
    auto registration=upgrade+"WITH owner_guard AS MATERIALIZED ("+td::integrity::owner_check_sql()+") "
        "INSERT INTO td_catalog_v1.schemas AS stored(name,version,dsl,ir,content_hash) SELECT "+
        sql(schema.name)+","+std::to_string(schema.version)+","+sql(dsl)+","+sql(ir)+",sha256("+sql(ir)+") FROM owner_guard WHERE ok "
        "ON CONFLICT(name,version) DO UPDATE SET content_hash=CASE WHEN stored.ir IS NULL OR stored.ir=excluded.ir THEN excluded.content_hash "
        "ELSE error('TD_E_SCHEMA_VERSION: an existing schema version is immutable') END";
    const auto selection=" FROM td_catalog_v1.schemas s WHERE s.name="+sql(schema.name)+
        " AND s.version="+std::to_string(schema.version);
    registration+=";"+td::presence::reserve_type_modes_sql(sql(schema.name),schema.version);
    const std::string schema_receipt="SELECT name,version,content_hash"+selection;
    if(!schema.unique_values&&!schema.live_entities)return registration+schema_receipt;

    const auto request_hash=schema.unique_values?td::uniqueness::activation_hash_sql("s"):td::presence::activation_hash_sql("s");
    const auto command_id=schema.unique_values?td::uniqueness::activation_id_sql(request_hash):td::presence::activation_id_sql(request_hash);
    const auto activation_receipt=schema.unique_values?td::uniqueness::activation_receipt_sql("u","u.position"):
        td::presence::activation_receipt_sql("u","u.position");
    const auto *ledger=schema.unique_values?"td_catalog_v1.schema_unique_activations":"td_catalog_v1.schema_presence_activations";
    const auto *collision=schema.unique_values?"'TD_E_SCHEMA_UNIQUE_ACTIVATION: activation command identity is already in use'":
        "'TD_E_SCHEMA_PRESENCE: activation command identity is already in use'";
    registration+="CREATE TEMP TABLE __td_schema_constraint_ctx AS SELECT s.name,s.version,s.content_hash,"+
        request_hash+" request_hash,"+command_id+R"TD_ACTIVATE( command_id,
 u.command_id IS NULL fresh,
 CASE WHEN u.command_id IS NOT NULL THEN c.position WHEN k.position>=9223372036854775806
 THEN error('TD_E_COMMAND_LIMIT: commit position exhausted') ELSE k.position+1 END position
 FROM td_catalog_v1.schemas s CROSS JOIN main.clock k
 LEFT JOIN )TD_ACTIVATE"+ledger+R"TD_ACTIVATE( u ON u.schema_name=s.name AND u.schema_version=s.version
 LEFT JOIN main.commands c ON c.command_id=u.command_id WHERE k.singleton AND s.name=)TD_ACTIVATE"+
        sql(schema.name)+" AND s.version="+std::to_string(schema.version)+R"TD_ACTIVATE(;
UPDATE main.clock SET position=(SELECT position FROM __td_schema_constraint_ctx)
 WHERE singleton AND (SELECT fresh FROM __td_schema_constraint_ctx);
INSERT INTO main.commands
 SELECT CASE WHEN EXISTS(SELECT 1 FROM main.commands c WHERE c.command_id=u.command_id)
 THEN error()TD_ACTIVATE"+collision+R"TD_ACTIVATE() ELSE u.command_id END,
 u.request_hash,u.position,)TD_ACTIVATE"+activation_receipt+R"TD_ACTIVATE(,
 u.command_id,epoch_ms(current_timestamp)::DOUBLE,'triplex' FROM __td_schema_constraint_ctx u WHERE u.fresh;
)TD_ACTIVATE";
    if(schema.live_entities)registration+=
        "INSERT INTO td_catalog_v1.schema_presence_activations SELECT name,version,command_id FROM __td_schema_constraint_ctx WHERE fresh;";
    if(schema.unique_values)registration+=R"TD_ACTIVATE(
INSERT INTO td_catalog_v1.schema_unique_activations
 SELECT name,version,command_id FROM __td_schema_constraint_ctx WHERE fresh;
CREATE TEMP TABLE __td_schema_unique_guard AS SELECT CASE WHEN )TD_ACTIVATE"+
        td::uniqueness::history_conflict_sql("__td_schema_constraint_ctx")+R"TD_ACTIVATE(
 THEN error('TD_E_SCHEMA_UNIQUE: existing entities share a unique value over overlapping intervals') ELSE TRUE END ok;
DROP TABLE __td_schema_unique_guard;
)TD_ACTIVATE";
    registration+="DROP TABLE __td_schema_constraint_ctx;"+schema_receipt;
    return registration;
}
namespace {
struct Record {
    std::map<std::string,std::set<Value,ValueLess>> values;
    std::map<std::pair<std::string,std::string>,std::string> blob_metadata;
};
Record checked_record(const Definition &schema,const std::string &name,const std::string &record) {
    const auto entity = schema.entities.find(name);
    if (entity==schema.entities.end()) error("ENTITY", "unknown entity type: " + name);
    Parser parser(record,65536); parser.need('{');
    Record result; size_t count = 0;
    while (!parser.take('}')) {
        if (++count>4096) error("LIMIT", "more than 4096 record values");
        const auto key = parser.key(); parser.need('=');
        std::string blob_extra;
        auto value = parser.value(schema.expanded_values,blob_extra); parser.need(';');
        const auto attribute = entity->second.attributes.find(key);
        if (attribute==entity->second.attributes.end()) error("ATTRIBUTE", "unknown attribute: " + key);
        if (attribute->second.tag != value.tag()) error("TYPE", "wrong value type for: " + key);
        if(!attribute->second.reference.empty()){
            const auto &id=value.tag()==ValueTag::Reference ? value.as_ref() : value.as_str();
            if(id.empty()||id.size()>128)error("REFERENCE","reference ID must contain 1..128 UTF-8 bytes: "+key);
        }
        if(value.tag()==ValueTag::Blob){
            const auto [found,inserted]=result.blob_metadata.try_emplace(
                std::make_pair(key,value.as_blob_id()),std::move(blob_extra));
            if(!inserted&&found->second!=blob_extra)error("BLOB","conflicting descriptors for blob ID: "+key);
        }
        result.values[key].insert(std::move(value));
    }
    parser.end();
    for (const auto &[key,attribute] : entity->second.attributes) {
        const auto found=result.values.find(key); const auto size=found==result.values.end()?0:found->second.size();
        if (attribute.required && !size) error("REQUIRED", "missing required attribute: " + key);
        if (!attribute.many && size>1) error("CARDINALITY", "multiple distinct values for: " + key);
    }
    return result;
}
}
void validate_record(const Definition &schema,const std::string &name,const std::string &record) {
    (void)checked_record(schema,name,record);
}
void validate_attribute(const Definition &schema,const std::string &name,const std::string &attribute,uint8_t tag){
    const auto entity=schema.entities.find(name);
    if(entity==schema.entities.end())error("ENTITY","unknown entity type: "+name);
    const auto field=entity->second.attributes.find(attribute);
    if(field==entity->second.attributes.end())error("ATTRIBUTE","unknown attribute: "+attribute);
    if(static_cast<uint8_t>(field->second.tag)!=tag)error("TYPE","wrong persisted value type for: "+attribute);
}
bool validate_blob_descriptor(std::string_view payload,std::string_view id,std::string_view extra_json){
    try {
        Parser parser(payload,max_blob_descriptor_bytes);
        parser.need('{');
        if (parser.string()!="id") return false;
        parser.need(':');
        if (parser.string()!=id) return false;
        parser.need(',');
        if (parser.string()!="mimeType") return false;
        parser.need(':'); const auto mime=parser.string(); parser.need(',');
        if (parser.string()!="size") return false;
        parser.need(':'); const auto size=parser.integer();
        std::optional<std::string> filename;
        if (parser.take(',')) {
            if (parser.string()!="filename") return false;
            parser.need(':'); filename=parser.string();
        }
        parser.need('}'); parser.end();
        const auto metadata=blob_metadata(id,mime,size,filename);
        return extra_json==metadata && payload==blob_payload(id,metadata);
    } catch (const Error &) {
        return false;
    }
}
std::string prepare_record_json(const Definition &schema,const std::string &name,const std::string &record) {
    const auto checked=checked_record(schema,name,record);
    std::string out="[";bool first=true;
    for(const auto &[attribute,set]:checked.values)for(const auto &value:set){
        std::string tag,payload,s="null",b="null",i="null",f="null";
        const std::string *blob_extra=nullptr;
        switch(value.tag()){
        case ValueTag::String:tag="str";payload=json(value.as_str());s=json(value.as_str());break;
        case ValueTag::Reference:tag="ref";payload=json(value.as_ref());s=payload;break;
        case ValueTag::Boolean:tag="bool";payload=value.as_bool()?"true":"false";b=payload;break;
        case ValueTag::Int64:tag="i64";i=json(std::to_string(value.as_i64()));payload=i;break;
        case ValueTag::Json:tag="json";payload=json(value.as_json());s=payload;break;
        case ValueTag::Blob:{
            const auto &id=value.as_blob_id();
            blob_extra=&checked.blob_metadata.at(std::make_pair(attribute,id));
            tag="blob";payload=blob_payload(id,*blob_extra);s=json(id);break;
        }
        case ValueTag::Float64:case ValueTag::DateTime:{
            const bool datetime=value.tag()==ValueTag::DateTime;
            tag=datetime?"datetime":"f64";
            const auto raw=detail::canonical_float_bits(detail::float_bits(datetime?value.as_datetime():value.as_f64()));
            constexpr char digits[]="0123456789abcdef";std::string bits(16,'0');
            for(size_t n=0;n<16;++n)bits[n]=digits[(raw>>((15-n)*4))&15];
            f=json(bits);payload=f;break;
        }
        }
        if(!first)out+=',';first=false;
        out+="{\"a\":"+json(attribute)+",\"tag\":"+json(tag)+",\"t\":"+std::to_string(static_cast<unsigned>(value.tag()))+
            ",\"payload\":"+json(payload)+",\"s\":"+s+",\"b\":"+b+",\"i\":"+i+",\"f\":"+f;
        const auto &reference=schema.entities.at(name).attributes.at(attribute).reference;
        if(!reference.empty())out+=",\"reference\":"+json(reference);
        if(blob_extra)out+=",\"extra_json\":"+json(*blob_extra);
        out+='}';
    }
    return out+"]";
}
}
