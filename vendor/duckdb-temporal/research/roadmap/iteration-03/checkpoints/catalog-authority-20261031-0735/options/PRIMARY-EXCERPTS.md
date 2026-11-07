# New contract-options primary excerpts

Exact DuckDB commit d54cbbe3df17e8e5ce68312f483b4155836112aa; MIT-licensed DuckDB source, copyright DuckDB contributors. Bounded excerpts support this new independent source-only decision analysis. No application failure/raw/backup material is included. Full bodies are not retained here; both receipt files hash the complete returned source.

## src/catalog/catalog_search_path.cpp

[Pinned lines 22–48](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/catalog_search_path.cpp#L22-L48)

```cpp
22 string CatalogSearchEntry::ToString() const {
23 	if (catalog.empty()) {
24 		return WriteOptionallyQuoted(schema);
25 	} else {
26 		return WriteOptionallyQuoted(catalog) + "." + WriteOptionallyQuoted(schema);
27 	}
28 }
29 
30 string CatalogSearchEntry::WriteOptionallyQuoted(const Identifier &input) {
31 	auto &name = input.GetIdentifierName();
32 	for (idx_t i = 0; i < name.size(); i++) {
33 		if (name[i] == '.' || name[i] == ',' || name[i] == '"') {
34 			return SQLQuotedIdentifier::ToString(name);
35 		}
36 	}
37 	return name;
38 }
39 
40 string CatalogSearchEntry::ListToString(const vector<CatalogSearchEntry> &input) {
41 	string result;
42 	for (auto &entry : input) {
43 		if (!result.empty()) {
44 			result += ",";
45 		}
46 		result += entry.ToString();
47 	}
48 	return result;
```

[Pinned lines 274–304](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/catalog_search_path.cpp#L274-L304)

```cpp
274 vector<Identifier> CatalogSearchPath::GetCatalogsForSchema(const Identifier &schema) const {
275 	vector<Identifier> catalogs;
276 	if (DefaultSchemaGenerator::IsDefaultSchema(schema)) {
277 		catalogs.push_back(Identifier::SystemCatalog());
278 	} else {
279 		for (auto &path : paths) {
280 			if (path.GetSchema() == schema || path.GetSchema().empty()) {
281 				catalogs.emplace_back(path.GetCatalog());
282 			}
283 		}
284 	}
285 	return catalogs;
286 }
287 
288 vector<Identifier> CatalogSearchPath::GetSchemasForCatalog(const Identifier &catalog) const {
289 	vector<Identifier> schemas;
290 	for (auto &path : paths) {
291 		if (!path.GetSchema().empty() && path.GetCatalog() == catalog) {
292 			schemas.emplace_back(path.GetSchema());
293 		}
294 	}
295 	return schemas;
296 }
297 
298 vector<CatalogSearchEntry> CatalogSearchPath::GetImplicitSearchCatalogs() const {
299 	// Get the implicit entries that were not already resolved by the precedence flag.
300 	vector<CatalogSearchEntry> catalogs;
301 	for (auto &path : paths) {
302 		if (path.GetSchema().empty() && !path.GetCatalog().empty() && !path.DefaultSchemaPrecedence()) {
303 			catalogs.push_back(path);
304 		}
```

[Pinned lines 333–354](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/catalog_search_path.cpp#L333-L354)

```cpp
333 const CatalogSearchEntry &CatalogSearchPath::GetDefault() const {
334 	D_ASSERT(paths.size() >= 2);
335 	D_ASSERT(!paths[1].GetSchema().empty());
336 	return paths[1];
337 }
338 
339 void CatalogSearchPath::SetPathsInternal(vector<CatalogSearchEntry> new_paths) {
340 	this->set_paths = std::move(new_paths);
341 
342 	paths.clear();
343 	paths.reserve(set_paths.size() + 4);
344 	paths.emplace_back(TEMP_CATALOG, DEFAULT_SCHEMA);
345 	for (auto &path : set_paths) {
346 		paths.push_back(path);
347 	}
348 	paths.emplace_back(INVALID_CATALOG, DEFAULT_SCHEMA);
349 	paths.emplace_back(SYSTEM_CATALOG, DEFAULT_SCHEMA);
350 	paths.emplace_back(SYSTEM_CATALOG, "pg_catalog");
351 	// set extension schemas on the search path, if any
352 	for (auto &schema : ExtensionCallbackManager::Get(context).GetExtensionSchemas()) {
353 		paths.emplace_back(Identifier(SYSTEM_CATALOG), Identifier(schema));
354 	}
```


## src/catalog/catalog.cpp

[Pinned lines 81–100](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/catalog.cpp#L81-L100)

```cpp
81 //! The default catalog for lookups; empty when no database is attached, in which case the lookup finds nothing there.
82 Identifier GetDefaultCatalog(CatalogEntryRetriever &retriever) {
83 	return DatabaseManager::TryGetDefaultDatabase(retriever.GetContext());
84 }
85 
86 optional_ptr<Catalog> Catalog::GetCatalogEntry(CatalogEntryRetriever &retriever, const Identifier &catalog_name) {
87 	auto &context = retriever.GetContext();
88 	auto &db_manager = DatabaseManager::Get(context);
89 	if (catalog_name == TEMP_CATALOG) {
90 		return &ClientData::Get(context).temporary_objects->GetCatalog();
91 	}
92 	if (catalog_name == SYSTEM_CATALOG) {
93 		return &GetSystemCatalog(context);
94 	}
95 	auto entry =
96 	    db_manager.GetDatabase(context, IsInvalidCatalog(catalog_name) ? GetDefaultCatalog(retriever) : catalog_name);
97 	if (!entry) {
98 		return nullptr;
99 	}
100 	return &entry->GetCatalog();
```

[Pinned lines 677–725](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/catalog.cpp#L677-L725)

```cpp
677 vector<CatalogSearchEntry> GetCatalogEntries(CatalogEntryRetriever &retriever, const Identifier &catalog,
678                                              const Identifier &schema, CatalogType lookup_type = CatalogType::INVALID) {
679 	auto &context = retriever.GetContext();
680 	vector<CatalogSearchEntry> entries;
681 	auto &search_path = retriever.GetSearchPath();
682 	if (IsInvalidCatalog(catalog) && IsInvalidSchema(schema)) {
683 		// no catalog or schema provided - scan the entire search path.
684 		if (lookup_type == CatalogType::INVALID || lookup_type == CatalogType::TABLE_ENTRY) {
685 			entries = search_path.Get();
686 		} else {
687 			// for non-table lookups, resolve implicit catalogs that requested precedence to their default schema in
688 			// place
689 			entries = search_path.GetWithPrecedenceSchemas(context);
690 		}
691 	} else if (IsInvalidCatalog(catalog)) {
692 		auto catalogs = search_path.GetCatalogsForSchema(schema);
693 		for (auto &catalog_name : catalogs) {
694 			entries.emplace_back(catalog_name, schema);
695 		}
696 		if (entries.empty()) {
697 			auto &default_entry = search_path.GetDefault();
698 			if (!IsInvalidCatalog(default_entry.GetCatalog())) {
699 				entries.emplace_back(default_entry.GetCatalog(), schema);
700 			} else if (auto default_database = DatabaseManager::TryGetDefaultDatabase(context);
701 			           !IsInvalidCatalog(default_database)) {
702 				entries.emplace_back(std::move(default_database), schema);
703 			}
704 		}
705 	} else if (IsInvalidSchema(schema)) {
706 		auto schemas = search_path.GetSchemasForCatalog(catalog);
707 		for (auto &schema_name : schemas) {
708 			entries.emplace_back(catalog, schema_name);
709 		}
710 		if (entries.empty()) {
711 			auto catalog_entry = Catalog::GetCatalogEntry(context, catalog);
712 			if (!catalog_entry) {
713 				entries.emplace_back(catalog, DEFAULT_SCHEMA);
714 			} else {
715 				auto default_schema = catalog_entry->GetDefaultSchema();
716 				// a catalog without a default schema has no implicit schema to fall back on
717 				if (default_schema) {
718 					entries.emplace_back(catalog, *default_schema);
719 				}
720 			}
721 		}
722 	} else {
723 		// specific catalog and schema provided
724 		entries.emplace_back(catalog, schema);
725 	}
```

[Pinned lines 1131–1133](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/catalog.cpp#L1131-L1133)

```cpp
1131 	bool allow_default_lookup = catalog.empty() && schema.empty();
1132 
1133 	return TryLookupEntry(retriever, lookups, lookup_info, if_not_found, allow_default_lookup);
```

[Pinned lines 1199–1223](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/catalog.cpp#L1199-L1223)

```cpp
1199 	// Special case for tables: we do a second lookup searching for catalogs with default tables that also match this
1200 	// lookup
1201 	if (lookup_info.GetCatalogType() == CatalogType::TABLE_ENTRY && allow_default_lookup) {
1202 		if (!result.Found()) {
1203 			result = TryLookupDefaultTable(retriever, lookup_info, false);
1204 			if (result.error.HasError()) {
1205 				error_data = std::move(result.error);
1206 			}
1207 		} else {
1208 			// allow_ignore_at_clause set to true to ensure `FROM <table_name> AT <version>` is considered
1209 			// ambiguous with a default table lookup in a catalog that does not support time travel
1210 			auto ambiguity_lookup = TryLookupDefaultTable(retriever, lookup_info, true);
1211 			if (ambiguity_lookup.Found()) {
1212 				ThrowDefaultTableAmbiguityException(result, ambiguity_lookup, lookup_info.GetEntryName());
1213 			}
1214 		}
1215 	}
1216 
1217 	// Special case for non-table entries (functions, macros, types): Fall back to the default schema of any
1218 	// catalog flagged as an implicit search catalog. Ignored if the schema already had precedence.
1219 	if (lookup_info.GetCatalogType() != CatalogType::TABLE_ENTRY && allow_default_lookup && !result.Found()) {
1220 		result = TryLookupDefaultSchema(retriever, lookup_info);
1221 		if (result.error.HasError()) {
1222 			error_data = std::move(result.error);
1223 		}
```

[Pinned lines 1277–1298](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/catalog.cpp#L1277-L1298)

```cpp
1277 CatalogEntryLookup Catalog::TryLookupDefaultTable(CatalogEntryRetriever &retriever, const EntryLookupInfo &lookup_info,
1278                                                   bool allow_ignore_at_clause) {
1279 	auto catalog_by_name = GetCatalogEntry(retriever, lookup_info.GetEntryIdentifier());
1280 
1281 	if (catalog_by_name && catalog_by_name->HasDefaultTable()) {
1282 		auto transaction = catalog_by_name->GetCatalogTransaction(retriever.GetContext());
1283 		QueryErrorContext context;
1284 
1285 		auto table_schema = catalog_by_name->GetDefaultTableSchema();
1286 		auto table_name = catalog_by_name->GetDefaultTable();
1287 
1288 		optional_ptr<BoundAtClause> at_clause;
1289 		if (!catalog_by_name->SupportsTimeTravel() && allow_ignore_at_clause) {
1290 			at_clause = nullptr;
1291 		} else {
1292 			at_clause = lookup_info.GetAtClause();
1293 		}
1294 
1295 		EntryLookupInfo info(CatalogType::TABLE_ENTRY,
1296 		                     QualifiedName(catalog_by_name->GetName(), table_schema, table_name), at_clause, context);
1297 		return catalog_by_name->TryLookupEntryInternal(transaction, info);
1298 	}
```

[Pinned lines 1303–1323](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/catalog.cpp#L1303-L1323)

```cpp
1303 CatalogEntryLookup Catalog::TryLookupDefaultSchema(CatalogEntryRetriever &retriever,
1304                                                    const EntryLookupInfo &lookup_info) {
1305 	// look for the entry in the default schema of every catalog that was flagged as an implicit search catalog
1306 	auto &search_path = retriever.GetSearchPath();
1307 	for (auto &implicit_catalog : search_path.GetImplicitSearchCatalogs()) {
1308 		auto catalog_entry = GetCatalogEntry(retriever, implicit_catalog.GetCatalog());
1309 		if (!catalog_entry) {
1310 			continue;
1311 		}
1312 		auto default_schema = catalog_entry->GetDefaultSchema();
1313 		if (!default_schema) {
1314 			continue;
1315 		}
1316 		auto transaction = catalog_entry->GetCatalogTransaction(retriever.GetContext());
1317 		EntryLookupInfo default_schema_lookup(
1318 		    lookup_info, QualifiedName(catalog_entry->GetName(), *default_schema, lookup_info.GetEntryIdentifier()));
1319 		auto result = catalog_entry->TryLookupEntryInternal(transaction, default_schema_lookup);
1320 		if (result.Found() || result.error.HasError()) {
1321 			return result;
1322 		}
1323 	}
```


## src/planner/binder/statement/bind_create.cpp

[Pinned lines 70–109](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/planner/binder/statement/bind_create.cpp#L70-L109)

```cpp
70 void Binder::BindSchemaOrCatalog(CatalogEntryRetriever &retriever, Identifier &catalog, Identifier &schema) {
71 	auto &context = retriever.GetContext();
72 	if (schema.empty()) {
73 		return;
74 	}
75 	if (!catalog.empty()) {
76 		return;
77 	}
78 	// schema is specified - but catalog is not
79 	// try searching for the catalog instead
80 	auto &db_manager = DatabaseManager::Get(context);
81 	auto database = db_manager.GetDatabase(context, schema);
82 	if (!database) {
83 		//! No database by that name was found
84 		return;
85 	}
86 	// we have a database with this name
87 	// check if there is a schema
88 	auto &search_path = retriever.GetSearchPath();
89 	auto catalog_names = search_path.GetCatalogsForSchema(schema);
90 	if (catalog_names.empty()) {
91 		// with no default database there is no schema for the name to be ambiguous with
92 		auto default_database = DatabaseManager::TryGetDefaultDatabase(context);
93 		if (!IsInvalidCatalog(default_database)) {
94 			catalog_names.emplace_back(std::move(default_database));
95 		}
96 	}
97 	for (auto &catalog_name : catalog_names) {
98 		auto catalog_ptr = Catalog::GetCatalogEntry(retriever, catalog_name);
99 		if (!catalog_ptr) {
100 			continue;
101 		}
102 		if (catalog_ptr->CheckAmbiguousCatalogOrSchema(context, schema)) {
103 			throw BinderException(
104 			    "Ambiguous reference to catalog or schema %s - use a fully qualified path like '%s.%s'", schema,
105 			    SQLIdentifier(catalog_name), SQLIdentifier(schema));
106 		}
107 	}
108 	catalog = schema;
109 	schema = Identifier();
```

[Pinned lines 247–271](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/planner/binder/statement/bind_create.cpp#L247-L271)

```cpp
247 QualifiedName Binder::BindTableName(CatalogEntryRetriever &retriever, const QualifiedName &name) {
248 	auto resolved = ResolveCatalog(retriever, name, false);
249 	auto &path = resolved.Path();
250 	if (path.size() < 2) {
251 		throw InternalException("Binder::BindTableName called with an empty name");
252 	}
253 	vector<Identifier> schema_path(path.begin() + 1, path.end() - 1);
254 	if (schema_path.size() <= 1) {
255 		// unqualified, or qualified with a single schema level: keep the (catalog, schema, name) shape so that the
256 		// regular search-path based lookup applies
257 		return QualifiedName(path.front(), schema_path.empty() ? Identifier() : schema_path[0], resolved.Name());
258 	}
259 	// a nested schema path was given - resolve the catalog holding the outermost schema so that the resulting
260 	// [catalog, schema path..., name] is fully qualified
261 	auto catalog = path.front();
262 	if (IsInvalidCatalog(catalog)) {
263 		EntryLookupInfo schema_lookup(CatalogType::SCHEMA_ENTRY, QualifiedName(schema_path[0]));
264 		auto schema = Catalog::GetSchema(retriever, schema_lookup, OnEntryNotFound::RETURN_NULL);
265 		if (schema) {
266 			catalog = schema->ParentCatalog().GetName();
267 		} else {
268 			catalog = DatabaseManager::GetDefaultDatabase(retriever.GetContext());
269 		}
270 	}
271 	return QualifiedName::FromCatalogSchema(std::move(catalog), std::move(schema_path), resolved.Name());
```

[Pinned lines 327–332](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/planner/binder/statement/bind_create.cpp#L327-L332)

```cpp
327 SchemaCatalogEntry &Binder::BindCreateSchema(CreateInfo &info) {
328 	auto &schema = BindSchema(info);
329 	if (schema.catalog.IsSystemCatalog()) {
330 		throw BinderException("Cannot create entry in system catalog");
331 	}
332 	return schema;
```


## src/main/attached_database.cpp

[Pinned lines 85–95](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/attached_database.cpp#L85-L95)

```cpp
85 		if (entry.first == "default_table") {
86 			default_table = QualifiedName::Parse(StringValue::Get(entry.second.DefaultCastAs(LogicalType::VARCHAR)));
87 			continue;
88 		}
89 
90 		if (entry.first == "hidden") {
91 			auto is_hidden = BooleanValue::Get(entry.second.DefaultCastAs(LogicalType::BOOLEAN));
92 			if (is_hidden) {
93 				visibility = AttachVisibility::HIDDEN;
94 			}
95 			continue;
```

[Pinned lines 225–227](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/attached_database.cpp#L225-L227)

```cpp
225 bool AttachedDatabase::NameIsReserved(const Identifier &name) {
226 	return name == DEFAULT_SCHEMA || name == TEMP_CATALOG || name == SYSTEM_CATALOG;
227 }
```


## src/main/database_manager.cpp

[Pinned lines 487–526](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/database_manager.cpp#L487-L526)

```cpp
487 Identifier DatabaseManager::GetDefaultDatabase(ClientContext &context) {
488 	auto result = TryGetDefaultDatabase(context);
489 	if (!IsInvalidCatalog(result)) {
490 		return result;
491 	}
492 	auto &connected_with = ClientData::Get(context).default_database;
493 	if (!IsInvalidCatalog(connected_with)) {
494 		throw CatalogException("The default database %s has been detached: select another database using `USE`",
495 		                       connected_with);
496 	}
497 	// Reachable on an instance created without a database (DuckDB::CreateEmpty).
498 	throw CatalogException("No database is attached: attach one with ATTACH before referring to a database");
499 }
500 
501 Identifier DatabaseManager::TryGetDefaultDatabase(ClientContext &context) {
502 	auto &client_data = ClientData::Get(context);
503 	auto &default_entry = client_data.catalog_search_path->GetDefault();
504 	if (!IsInvalidCatalog(default_entry.GetCatalog())) {
505 		return default_entry.GetCatalog();
506 	}
507 	auto &manager = DatabaseManager::Get(context);
508 	// Callable outside a transaction: only consult the transaction's references when one is active.
509 	const bool in_transaction = context.transaction.HasActiveTransaction();
510 	if (!IsInvalidCatalog(client_data.default_database)) {
511 		// still the default while attached, or while this transaction still references it
512 		if (manager.GetDatabase(client_data.default_database)) {
513 			return client_data.default_database;
514 		}
515 		if (in_transaction && MetaTransaction::Get(context).GetReferencedDatabase(client_data.default_database)) {
516 			return client_data.default_database;
517 		}
518 		return Identifier();
519 	}
520 	if (in_transaction && !manager.HasAttachedDatabase()) {
521 		auto modified_database = MetaTransaction::Get(context).ModifiedDatabase();
522 		if (modified_database) {
523 			return modified_database->GetName();
524 		}
525 	}
526 	return Identifier();
```

[Pinned lines 542–562](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/database_manager.cpp#L542-L562)

```cpp
542 vector<shared_ptr<AttachedDatabase>> DatabaseManager::GetDatabases(ClientContext &context,
543                                                                    const optional_idx max_db_count) {
544 	vector<shared_ptr<AttachedDatabase>> result;
545 
546 	lock_guard<mutex> guard(databases_lock);
547 	idx_t count = 2;
548 	for (auto &entry : databases) {
549 		if (max_db_count.IsValid() && count >= max_db_count.GetIndex()) {
550 			break;
551 		}
552 		result.push_back(entry.second);
553 		count++;
554 	}
555 	if (!max_db_count.IsValid() || max_db_count.GetIndex() >= 1) {
556 		result.push_back(system);
557 	}
558 	if (!max_db_count.IsValid() || max_db_count.GetIndex() >= 2) {
559 		result.push_back(context.client_data->temporary_objects);
560 	}
561 
562 	return result;
```


## src/main/settings/custom_settings.cpp

[Pinned lines 1556–1579](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/settings/custom_settings.cpp#L1556-L1579)

```cpp
1556 Value SchemaSetting::GetSetting(const ClientContext &context) {
1557 	auto &client_data = ClientData::Get(context);
1558 	return client_data.catalog_search_path->GetDefault().GetSchema();
1559 }
1560 
1561 //===----------------------------------------------------------------------===//
1562 // Search Path
1563 //===----------------------------------------------------------------------===//
1564 void SearchPathSetting::SetLocal(ClientContext &context, const Value &input) {
1565 	auto parameter = input.ToString();
1566 	auto &client_data = ClientData::Get(context);
1567 	client_data.catalog_search_path->Set(CatalogSearchEntry::ParseList(parameter), CatalogSetPathType::SET_SCHEMAS);
1568 }
1569 
1570 void SearchPathSetting::ResetLocal(ClientContext &context) {
1571 	// FIXME: catalog_search_path is controlled by both SchemaSetting and SearchPathSetting
1572 	auto &client_data = ClientData::Get(context);
1573 	client_data.catalog_search_path->Reset();
1574 }
1575 
1576 Value SearchPathSetting::GetSetting(const ClientContext &context) {
1577 	auto &client_data = ClientData::Get(context);
1578 	auto &set_paths = client_data.catalog_search_path->GetSetPaths();
1579 	return Value(CatalogSearchEntry::ListToString(set_paths));
```


## extension/core_functions/scalar/generic/system_functions.cpp

[Pinned lines 23–33](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/extension/core_functions/scalar/generic/system_functions.cpp#L23-L33)

```cpp
23 // current_schema
24 void CurrentSchemaFunction(DataChunk &input, ExpressionState &state, Vector &result) {
25 	Value val(ClientData::Get(state.GetContext()).catalog_search_path->GetDefault().GetSchema());
26 	result.Reference(val, count_t(input.size()));
27 }
28 
29 // current_database
30 void CurrentDatabaseFunction(DataChunk &input, ExpressionState &state, Vector &result) {
31 	Value val(DatabaseManager::GetDefaultDatabase(state.GetContext()));
32 	result.Reference(val, count_t(input.size()));
33 }
```

[Pinned lines 115–124](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/extension/core_functions/scalar/generic/system_functions.cpp#L115-L124)

```cpp
115 ScalarFunction CurrentSchemaFun::GetFunction() {
116 	ScalarFunction current_schema({}, LogicalType::VARCHAR, CurrentSchemaFunction);
117 	current_schema.SetStability(FunctionStability::CONSISTENT_WITHIN_QUERY);
118 	return current_schema;
119 }
120 
121 ScalarFunction CurrentDatabaseFun::GetFunction() {
122 	ScalarFunction current_database({}, LogicalType::VARCHAR, CurrentDatabaseFunction);
123 	current_database.SetStability(FunctionStability::CONSISTENT_WITHIN_QUERY);
124 	return current_database;
```


## src/planner/binder/tableref/bind_basetableref.cpp

[Pinned lines 142–170](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/planner/binder/tableref/bind_basetableref.cpp#L142-L170)

```cpp
142 BoundStatement Binder::Bind(BaseTableRef &ref) {
143 	QueryErrorContext error_context(ref.query_location);
144 	// CTEs and views are also referred to using BaseTableRefs, hence need to distinguish here
145 	// check if the table name refers to a CTE
146 
147 	// CTE name should never be qualified (i.e. schema_name should be empty)
148 	// unless we want to refer to the recurring table of "using key".
149 	BindingAlias binding_alias(ref.GetQualifiedName().Schema(), ref.Table());
150 	auto ctebinding = GetCTEBinding(binding_alias);
151 	if (ctebinding && ctebinding->CanBeReferenced()) {
152 		ctebinding->Reference();
153 
154 		// There is a CTE binding in the BindContext.
155 		// This can only be the case if there is a recursive CTE,
156 		// or a materialized CTE present.
157 		auto index = GenerateTableIndex();
158 
159 		auto alias = ref.alias.empty() ? ref.Table() : ref.alias;
160 		auto names = BindContext::AliasColumnNames(alias, ctebinding->GetColumnNames(), ref.column_name_alias);
161 
162 		bind_context.AddGenericBinding(index, alias, names, ctebinding->GetColumnTypes());
163 
164 		bool is_recurring = ref.GetQualifiedName().Schema() == "recurring";
165 
166 		BoundStatement result;
167 		result.types = ctebinding->GetColumnTypes();
168 		result.names = names;
169 		result.plan = make_uniq<LogicalCTERef>(index, ctebinding->GetIndex(), result.types, names, is_recurring);
170 		return result;
```

[Pinned lines 173–182](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/planner/binder/tableref/bind_basetableref.cpp#L173-L182)

```cpp
173 	// not a CTE
174 	// extract a table or view from the catalog
175 	auto at_clause = BindAtClause(ref.at_clause);
176 	auto entry_at_clause = at_clause ? at_clause.get() : entry_retriever.GetAtClause();
177 	EntryLookupInfo table_lookup(CatalogType::TABLE_ENTRY, QualifiedName(ref.Table()), entry_at_clause, error_context);
178 	// resolve the catalog/schema qualification for the lookup only - the reference itself keeps the name as written,
179 	// which is what name extraction and replacement scans report
180 	auto bound_name = BindTableName(entry_retriever, ref.GetQualifiedName());
181 	auto table_or_view =
182 	    entry_retriever.GetEntry(EntryLookupInfo(table_lookup, bound_name), OnEntryNotFound::RETURN_NULL);
```

[Pinned lines 250–260](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/planner/binder/tableref/bind_basetableref.cpp#L250-L260)

```cpp
250 	switch (table_or_view->type) {
251 	case CatalogType::TABLE_ENTRY: {
252 		// base table
253 		auto table_index = GenerateTableIndex();
254 		auto &table = table_or_view->Cast<TableCatalogEntry>();
255 
256 		auto &properties = GetStatementProperties();
257 		properties.RegisterDBRead(table.ParentCatalog(), context);
258 
259 		unique_ptr<FunctionData> bind_data;
260 		auto scan_function = table.GetScanFunction(context, bind_data, table_lookup);
```


## src/parser/peg/transformer/transform_common.cpp

[Pinned lines 53–56](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/parser/peg/transformer/transform_common.cpp#L53-L56)

```cpp
53 LogicalType PEGTransformerFactory::TransformType(PEGTransformer &transformer,
54                                                  unique_ptr<ParsedExpression> type_variations,
55                                                  const optional<vector<int64_t>> &array_bounds) {
56 	return LogicalType::UNBOUND(TransformNestedType(transformer, std::move(type_variations), array_bounds));
```

[Pinned lines 203–233](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/parser/peg/transformer/transform_common.cpp#L203-L233)

```cpp
203 unique_ptr<ParsedExpression> PEGTransformerFactory::TransformSimpleNumericType(PEGTransformer &transformer,
204                                                                                const string &child) {
205 	return make_uniq<TypeExpression>(Identifier(child), vector<unique_ptr<ParsedExpression>> {});
206 }
207 
208 string PEGTransformerFactory::TransformIntType(PEGTransformer &transformer) {
209 	return LogicalTypeIdToString(LogicalTypeId::INTEGER);
210 }
211 
212 string PEGTransformerFactory::TransformIntegerType(PEGTransformer &transformer) {
213 	return LogicalTypeIdToString(LogicalTypeId::INTEGER);
214 }
215 
216 string PEGTransformerFactory::TransformSmallintType(PEGTransformer &transformer) {
217 	return LogicalTypeIdToString(LogicalTypeId::SMALLINT);
218 }
219 
220 string PEGTransformerFactory::TransformBigintType(PEGTransformer &transformer) {
221 	return LogicalTypeIdToString(LogicalTypeId::BIGINT);
222 }
223 
224 string PEGTransformerFactory::TransformRealType(PEGTransformer &transformer) {
225 	return LogicalTypeIdToString(LogicalTypeId::FLOAT);
226 }
227 
228 string PEGTransformerFactory::TransformBooleanType(PEGTransformer &transformer) {
229 	return LogicalTypeIdToString(LogicalTypeId::BOOLEAN);
230 }
231 
232 string PEGTransformerFactory::TransformDoubleType(PEGTransformer &transformer) {
233 	return LogicalTypeIdToString(LogicalTypeId::DOUBLE);
```


## src/planner/binder/expression/bind_type_expression.cpp

[Pinned lines 28–67](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/planner/binder/expression/bind_type_expression.cpp#L28-L67)

```cpp
28 	// Resolve the qualification the same way a table reference is resolved: a leading component is the catalog when
29 	// it names an attached database, and otherwise the outermost schema of a (possibly nested) schema path.
30 	auto bound_name = Binder::BindTableName(binder.EntryRetriever(), type_expr.GetQualifiedName());
31 	auto &type_catalog = bound_name.Catalog();
32 	bool is_qualified = bound_name.Path().size() > 1;
33 
34 	if (type_catalog.empty() && !DatabaseManager::Get(context).HasAttachedDatabase()) {
35 		// Look in the system catalog if no catalog was specified
36 		entry = binder.entry_retriever.GetEntry(
37 		    EntryLookupInfo(type_lookup, bound_name.WithCatalog(Identifier::SystemCatalog())));
38 	} else {
39 		// Try to search from most specific to least specific
40 		// The search path should already have been set to the correct catalog/schema,
41 		// in case we are looking for a type in the same schema as a table we are creating
42 
43 		entry = binder.entry_retriever.GetEntry(EntryLookupInfo(type_lookup, bound_name), OnEntryNotFound::RETURN_NULL);
44 
45 		if (!IsValidTypeLookup(entry)) {
46 			if (is_qualified) {
47 				// re-run the lookup to report the qualification that was given
48 				entry = binder.entry_retriever.GetEntry(EntryLookupInfo(type_lookup, bound_name),
49 				                                        OnEntryNotFound::THROW_EXCEPTION);
50 			}
51 			entry = binder.entry_retriever.GetEntry(
52 			    EntryLookupInfo(type_lookup, QualifiedName(type_catalog, Identifier::InvalidSchema(),
53 			                                               type_lookup.GetEntryIdentifier())),
54 			    OnEntryNotFound::RETURN_NULL);
55 		}
56 		if (!IsValidTypeLookup(entry)) {
57 			entry = binder.entry_retriever.GetEntry(
58 			    EntryLookupInfo(type_lookup, QualifiedName(Identifier::InvalidCatalog(), Identifier::InvalidSchema(),
59 			                                               type_lookup.GetEntryIdentifier())),
60 			    OnEntryNotFound::RETURN_NULL);
61 		}
62 		if (!IsValidTypeLookup(entry)) {
63 			entry = binder.entry_retriever.GetEntry(
64 			    EntryLookupInfo(type_lookup, QualifiedName(Identifier::SystemCatalog(), Identifier::DefaultSchema(),
65 			                                               type_lookup.GetEntryIdentifier())),
66 			    OnEntryNotFound::THROW_EXCEPTION);
67 		}
```


## src/catalog/catalog_entry/duck_schema_entry.cpp

[Pinned lines 76–84](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/catalog_entry/duck_schema_entry.cpp#L76-L84)

```cpp
76       tables(catalog, catalog.IsSystemCatalog() ? make_uniq<DefaultViewGenerator>(catalog, *this) : nullptr),
77       indexes(catalog),
78       table_functions(catalog,
79                       catalog.IsSystemCatalog() ? make_uniq<DefaultTableFunctionGenerator>(catalog, *this) : nullptr),
80       copy_functions(catalog), pragma_functions(catalog),
81       functions(catalog, catalog.IsSystemCatalog() ? make_uniq<DefaultFunctionGenerator>(catalog, *this) : nullptr),
82       sequences(catalog), collations(catalog), types(catalog, make_uniq<DefaultTypeGenerator>(catalog, *this)),
83       coordinate_systems(
84           catalog, catalog.IsSystemCatalog() ? make_uniq<DefaultCoordinateSystemGenerator>(catalog, *this) : nullptr) {
```

[Pinned lines 269–271](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/catalog_entry/duck_schema_entry.cpp#L269-L271)

```cpp
269 optional_ptr<CatalogEntry> DuckSchemaEntry::CreateType(CatalogTransaction transaction, CreateTypeInfo &info) {
270 	auto type_entry = make_uniq<TypeCatalogEntry>(catalog, *this, info);
271 	return AddEntry(transaction, std::move(type_entry), info.on_conflict);
```

[Pinned lines 434–435](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/catalog_entry/duck_schema_entry.cpp#L434-L435)

```cpp
434 	case CatalogType::TYPE_ENTRY:
435 		return types;
```


## src/catalog/default/default_types.cpp

[Pinned lines 408–414](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/default/default_types.cpp#L408-L414)

```cpp
408                                            {"varchar", LogicalTypeId::VARCHAR, RegisterVarcharConstructors},
409                                            {"bpchar", LogicalTypeId::VARCHAR, RegisterVarcharConstructors},
410                                            {"string", LogicalTypeId::VARCHAR, RegisterVarcharConstructors},
411                                            {"char", LogicalTypeId::VARCHAR, RegisterVarcharConstructors},
412                                            {"nvarchar", LogicalTypeId::VARCHAR, RegisterVarcharConstructors},
413                                            {"text", LogicalTypeId::VARCHAR, RegisterVarcharConstructors},
414                                            {"blob", LogicalTypeId::BLOB, nullptr},
```

[Pinned lines 422–422](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/default/default_types.cpp#L422-L422)

```cpp
422                                            {"bigint", LogicalTypeId::BIGINT, nullptr},
```

[Pinned lines 445–451](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/default/default_types.cpp#L445-L451)

```cpp
445                                            {"utinyint", LogicalTypeId::UTINYINT, nullptr},
446                                            {"uint8", LogicalTypeId::UTINYINT, nullptr},
447                                            {"struct", LogicalTypeId::STRUCT, RegisterStructConstructors},
448                                            {"row", LogicalTypeId::STRUCT, RegisterStructConstructors},
449                                            {"tuple", LogicalTypeId::TUPLE, RegisterTupleConstructors},
450                                            {"list", LogicalTypeId::LIST, RegisterListConstructors},
451                                            {"array", LogicalTypeId::ARRAY, RegisterArrayConstructors},
```

[Pinned lines 459–469](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/default/default_types.cpp#L459-L469)

```cpp
459                                            {"boolean", LogicalTypeId::BOOLEAN, nullptr},
460                                            {"bool", LogicalTypeId::BOOLEAN, nullptr},
461                                            {"logical", LogicalTypeId::BOOLEAN, nullptr},
462                                            {"uuid", LogicalTypeId::UUID, nullptr},
463                                            {"guid", LogicalTypeId::UUID, nullptr},
464                                            {"enum", LogicalTypeId::ENUM, RegisterEnumConstructors},
465                                            {"null", LogicalTypeId::SQLNULL, nullptr},
466                                            {"float", LogicalTypeId::FLOAT, RegisterFloatConstructors},
467                                            {"real", LogicalTypeId::FLOAT, nullptr},
468                                            {"float4", LogicalTypeId::FLOAT, nullptr},
469                                            {"double", LogicalTypeId::DOUBLE, nullptr},
```

[Pinned lines 528–555](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/default/default_types.cpp#L528-L555)

```cpp
528 unique_ptr<CatalogEntry> DefaultTypeGenerator::CreateDefaultEntry(ClientContext &context,
529                                                                   const Identifier &entry_name) {
530 	if (schema.name != DEFAULT_SCHEMA) {
531 		return nullptr;
532 	}
533 	auto entry = TryGetDefaultTypeEntry(entry_name);
534 	if (!entry || entry->type == LogicalTypeId::INVALID) {
535 		return nullptr;
536 	}
537 	CreateTypeInfo info;
538 	info.SetTypeName(entry_name);
539 	info.type = LogicalType(entry->type);
540 	info.internal = true;
541 	info.temporary = true;
542 	info.constructors = GetConstructors(*entry, entry_name);
543 	return make_uniq_base<CatalogEntry, TypeCatalogEntry>(catalog, schema, info);
544 }
545 
546 vector<Identifier> DefaultTypeGenerator::GetDefaultEntries() {
547 	vector<Identifier> result;
548 	if (schema.name != DEFAULT_SCHEMA) {
549 		return result;
550 	}
551 	auto &internal_types = BUILTIN_TYPES;
552 	for (auto &type : internal_types) {
553 		result.emplace_back(StringUtil::Lower(type.name));
554 	}
555 	return result;
```


## src/catalog/catalog_set.cpp

[Pinned lines 96–103](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/catalog_set.cpp#L96-L103)

```cpp
96 bool CatalogSet::StartChain(CatalogTransaction transaction, const Identifier &name, unique_lock<mutex> &read_lock) {
97 	D_ASSERT(!map.GetEntry(name));
98 
99 	// check if there is a default entry
100 	auto entry = CreateDefaultEntry(transaction, name, read_lock);
101 	if (entry) {
102 		return false;
103 	}
```

[Pinned lines 173–185](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/catalog_set.cpp#L173-L185)

```cpp
173 bool CatalogSet::CreateEntryInternal(CatalogTransaction transaction, const Identifier &name,
174                                      unique_ptr<CatalogEntry> value, unique_lock<mutex> &read_lock,
175                                      bool should_be_empty) {
176 	auto entry_value = map.GetEntry(name);
177 	if (!entry_value) {
178 		// Add a dummy node to start the chain
179 		if (!StartChain(transaction, name, read_lock)) {
180 			return false;
181 		}
182 	} else if (should_be_empty) {
183 		// Verify that the entry is deleted, not altered by another transaction
184 		if (!VerifyVacancy(transaction, *entry_value)) {
185 			return false;
```

[Pinned lines 542–552](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/catalog_set.cpp#L542-L552)

```cpp
542 CatalogEntry &CatalogSet::GetEntryForTransaction(CatalogTransaction transaction, CatalogEntry &current, bool &visible) {
543 	reference<CatalogEntry> entry(current);
544 	while (entry.get().HasChild()) {
545 		if (UseTimestamp(transaction, entry.get().timestamp)) {
546 			visible = true;
547 			return entry.get();
548 		}
549 		entry = entry.get().Child();
550 	}
551 	visible = false;
552 	return entry.get();
```

[Pinned lines 710–721](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/catalog_set.cpp#L710-L721)

```cpp
710 void CatalogSet::Scan(CatalogTransaction transaction, const std::function<void(CatalogEntry &)> &callback) {
711 	// Lock the catalog set.
712 	unique_lock<mutex> lock(catalog_lock);
713 	CreateDefaultEntries(transaction, lock);
714 
715 	for (auto &kv : map.Entries()) {
716 		auto &entry = *kv.second;
717 		auto &entry_for_transaction = GetEntryForTransaction(transaction, entry);
718 		if (!entry_for_transaction.deleted) {
719 			callback(entry_for_transaction);
720 		}
721 	}
```


## src/planner/binder/statement/bind_drop.cpp

[Pinned lines 90–99](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/planner/binder/statement/bind_drop.cpp#L90-L99)

```cpp
90 		} else {
91 			EntryLookupInfo entry_lookup(stmt.info->type, stmt.info->GetQualifiedName());
92 			entry = Catalog::GetEntry(context, entry_lookup, stmt.info->if_not_found);
93 		}
94 		if (!entry) {
95 			break;
96 		}
97 		if (entry->internal) {
98 			throw CatalogException("Cannot drop internal catalog entry %s!", entry->name);
99 		}
```


## src/catalog/catalog_entry/type_catalog_entry.cpp

[Pinned lines 15–30](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/catalog_entry/type_catalog_entry.cpp#L15-L30)

```cpp
15 TypeCatalogEntry::TypeCatalogEntry(Catalog &catalog, SchemaCatalogEntry &schema, CreateTypeInfo &info)
16     : StandardEntry(CatalogType::TYPE_ENTRY, schema, catalog, info.GetTypeName()), user_type(info.type),
17       constructors(info.constructors) {
18 	if (constructors.functions.empty()) {
19 		// a type without constructors takes no modifiers and always resolves to its own type
20 		constructors.AddFunction(TypeConstructor::Identity(name));
21 	}
22 	constructors.SetName(name);
23 	constructors.ApplyToFunctions([&](TypeConstructor &constructor) {
24 		constructor.SetName(name);
25 		constructor.SetCatalogName(catalog.GetAttached().GetName());
26 		constructor.SetSchemaName(schema.name);
27 	});
28 	this->temporary = info.temporary;
29 	this->internal = info.internal;
30 	this->extension_name = info.extension_name;
```


## src/function/table/system/duckdb_types.cpp

[Pinned lines 61–62](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/function/table/system/duckdb_types.cpp#L61-L62)

```cpp
61 	names.emplace_back("internal");
62 	return_types.emplace_back(LogicalType::BOOLEAN);
```

[Pinned lines 82–89](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/function/table/system/duckdb_types.cpp#L82-L89)

```cpp
82 unique_ptr<GlobalTableFunctionState> DuckDBTypesInit(ClientContext &context, TableFunctionInitInput &input) {
83 	auto result = make_uniq<DuckDBTypesData>();
84 	auto schemas = Catalog::GetAllSchemas(context);
85 	for (auto &schema : schemas) {
86 		schema.get().Scan(context, CatalogType::TYPE_ENTRY,
87 		                  [&](CatalogEntry &entry) { result->entries.push_back(entry.Cast<TypeCatalogEntry>()); });
88 	};
89 	return std::move(result);
```

[Pinned lines 137–144](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/function/table/system/duckdb_types.cpp#L137-L144)

```cpp
137 	while (data.offset < data.entries.size() && count < STANDARD_VECTOR_SIZE) {
138 		auto &type_entry = data.entries[data.offset].get();
139 		auto &type = type_entry.user_type;
140 		auto &constructor = *type_entry.constructors.GetFunctionByOffset(data.constructor_offset++);
141 		if (data.constructor_offset >= type_entry.constructors.functions.size()) {
142 			data.offset++;
143 			data.constructor_offset = 0;
144 		}
```

[Pinned lines 221–224](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/function/table/system/duckdb_types.cpp#L221-L224)

```cpp
221 		comment.Append(Value(type_entry.comment));
222 		tags.Append(Value::MAP(type_entry.tags));
223 		internal.Append(Value::BOOLEAN(type_entry.internal));
224 		extension_name.Append(type_entry.extension_name.empty() ? Value() : Value(type_entry.extension_name));
```


## src/parser/peg/transformer/transform_expression.cpp

[Pinned lines 699–704](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/parser/peg/transformer/transform_expression.cpp#L699-L704)

```cpp
699 static unique_ptr<ParsedExpression> ApplyIsTest(unique_ptr<ParsedExpression> expr,
700                                                 unique_ptr<ParsedExpression> is_expr) {
701 	if (is_expr->GetExpressionClass() == ExpressionClass::COMPARISON) {
702 		auto compare_expr = unique_ptr_cast<ParsedExpression, ComparisonExpression>(std::move(is_expr));
703 		compare_expr->LeftMutable() = make_uniq<CastExpression>(LogicalType::BOOLEAN, std::move(expr));
704 		return std::move(compare_expr);
```

[Pinned lines 824–832](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/parser/peg/transformer/transform_expression.cpp#L824-L832)

```cpp
824 unique_ptr<ParsedExpression> PEGTransformerFactory::TransformIsLiteral(PEGTransformer &transformer,
825                                                                        const bool &has_result,
826                                                                        const Value &is_literal_value) {
827 	if (is_literal_value.IsNull()) {
828 		auto expr_type = has_result ? ExpressionType::OPERATOR_IS_NOT_NULL : ExpressionType::OPERATOR_IS_NULL;
829 		return make_uniq<OperatorExpression>(expr_type, nullptr);
830 	}
831 	auto expr_type = has_result ? ExpressionType::COMPARE_DISTINCT_FROM : ExpressionType::COMPARE_NOT_DISTINCT_FROM;
832 	return make_uniq<ComparisonExpression>(expr_type, nullptr, ConstantExpression::FromValue(is_literal_value));
```


## src/planner/binder/query_node/bind_select_node.cpp

[Pinned lines 56–64](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/planner/binder/query_node/bind_select_node.cpp#L56-L64)

```cpp
56 BoundLimitNode Binder::BindLimitValue(OrderBinder &order_binder, unique_ptr<ParsedExpression> limit_val,
57                                       LimitValueType value_type, bool is_offset) {
58 	auto new_binder = Binder::CreateBinder(context, this);
59 	ExpressionBinder expr_binder(*new_binder, context);
60 	bool is_percentage = value_type == LimitValueType::PERCENTAGE;
61 	auto target_type = is_percentage ? LogicalType::DOUBLE : LogicalType::BIGINT;
62 	expr_binder.target_type = target_type;
63 	auto original_limit = limit_val->Copy();
64 	auto expr = expr_binder.Bind(limit_val);
```

[Pinned lines 76–78](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/planner/binder/query_node/bind_select_node.cpp#L76-L78)

```cpp
76 	if (expr->IsFoldable()) {
77 		//! this is a constant
78 		auto val = ExpressionExecutor::EvaluateScalar(context, *expr).CastAs(context, target_type);
```


## src/catalog/catalog_transaction.cpp

[Pinned lines 8–11](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/catalog/catalog_transaction.cpp#L8-L11)

```cpp
8 CatalogTransaction::CatalogTransaction(Catalog &catalog, ClientContext &context)
9     : db(&DatabaseInstance::GetDatabase(context)), context(&context), transaction(&Transaction::Get(context, catalog)),
10       view(transaction->GetSnapshotView()) {
11 }
```


## src/transaction/meta_transaction.cpp

[Pinned lines 60–84](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/transaction/meta_transaction.cpp#L60-L84)

```cpp
60 Transaction &MetaTransaction::GetTransaction(AttachedDatabase &db) {
61 	if (ValidChecker::IsInvalidated(db)) {
62 		throw IOException("%s", ValidChecker::InvalidatedMessage(db));
63 	}
64 	lock_guard<mutex> guard(lock);
65 	auto entry = transactions.find(db);
66 	if (entry == transactions.end()) {
67 		auto &new_transaction = db.GetTransactionManager().StartTransaction(context);
68 		new_transaction.active_query = active_query.load();
69 #ifdef DEBUG
70 		VerifyAllTransactionsUnique(db, all_transactions);
71 #endif
72 		// Rollback looks every entry of all_transactions up in transactions, so the two must not get out of sync:
73 		// reserve first, then insert, so that a failing allocation happens before either is modified and the
74 		// push_back that follows cannot allocate.
75 		all_transactions.reserve(all_transactions.size() + 1);
76 		transactions.insert(make_pair(reference<AttachedDatabase>(db), TransactionReference(new_transaction)));
77 		all_transactions.push_back(db);
78 		auto shared_db = db.shared_from_this();
79 		UseDatabase(shared_db);
80 
81 		return new_transaction;
82 	} else {
83 		D_ASSERT(entry->second.transaction.active_query == active_query);
84 		return entry->second.transaction;
```

[Pinned lines 241–256](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/transaction/meta_transaction.cpp#L241-L256)

```cpp
241 AttachedDatabase &MetaTransaction::UseDatabase(shared_ptr<AttachedDatabase> &database) {
242 	auto &db_ref = *database;
243 	lock_guard<mutex> guard(referenced_database_lock);
244 	auto entry = referenced_databases.find(db_ref);
245 	if (entry == referenced_databases.end()) {
246 		auto used_entry = used_databases.emplace(db_ref.GetName(), db_ref);
247 		if (!used_entry.second) {
248 			// e.g. a database was detached and another one attached under the same name in this transaction
249 			throw TransactionException(
250 			    "Database name %s was already used by a different database in this transaction - commit or roll back "
251 			    "the transaction before using the name for another database",
252 			    db_ref.GetName());
253 		}
254 		referenced_databases.emplace(reference<AttachedDatabase>(db_ref), database);
255 	}
256 	return db_ref;
```


## src/transaction/duck_transaction_manager.cpp

[Pinned lines 90–105](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/transaction/duck_transaction_manager.cpp#L90-L105)

```cpp
90 	// obtain the start time and transaction ID of this transaction
91 	transaction_t start_time = current_start_timestamp++;
92 	transaction_t transaction_id = current_transaction_id++;
93 	// the transaction sees its own writes, and every commit before its start time
94 	SnapshotView view(transaction_id, VisibilityBound::Before(start_time));
95 	if (active_transactions.empty()) {
96 		lowest_visibility_bound = view.visibility_bound;
97 	}
98 
99 	// create the actual transaction
100 	auto transaction = make_uniq<DuckTransaction>(*this, context, start_time, view, last_committed_version);
101 	auto &transaction_ref = *transaction;
102 
103 	// store it in the set of active transactions
104 	active_transactions.push_back(std::move(transaction));
105 	return transaction_ref;
```


## src/include/duckdb_v2.h

[Pinned lines 343–352](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_v2.h#L343-L352)

```cpp
343 /*!
344  * A borrowed handle to a client context: a connection seen from inside DuckDB. Handed out within DuckDB-managed scopes
345  * — function bind / init / exec callbacks, replacement scans, and the extension entrypoint — and valid only for the
346  * duration of that scope; the caller never destroys it. Within that scope a transaction is already active. A context
347  * reaches the same capabilities a connection does, through `duckdb_v2_context_get_factory()`,
348  * `duckdb_v2_context_get_config()`, `duckdb_v2_context_get_file_system()` and `duckdb_v2_context_log()`.
349  */
350 typedef struct _duckdb_v2_context {
351 	void *internal_ptr;
352 } * duckdb_v2_context_handle;
```

[Pinned lines 5927–5949](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_v2.h#L5927-L5949)

```cpp
5927  * Resolves a table name and snapshots its description.
5928  *
5929  * Resolves name in the connection's catalogs and returns an owned description of the table it names. name may be
5930  * partial: an unqualified or schema-qualified name resolves through the connection's search path, exactly as the same
5931  * name resolves in SQL. A two-part name tries the first part as a schema and as an attached database, as SQL does, and
5932  * is rejected when both readings exist. A name that resolves to nothing is rejected with the engine's missing-table
5933  * error; a name that resolves to a view is rejected with the engine's not-a-table error, since a description snapshots
5934  * a base table.
5935  *
5936  * history:
5937  * - unstable: v2.0.0
5938  *
5939  * @param conn The connection whose catalogs and search path resolve the name.
5940  * @param name The possibly partial table name to resolve. Borrowed for the call only.
5941  * @param desc On success, receives the owned description. Destroy via `duckdb_v2_table_description_destroy()`.
5942  * @param err Optional. On failure, receives an opaque info handle the caller must destroy via
5943  * `duckdb_v2_error_info_destroy()`.
5944  * @return DUCKDB_V2_ERROR
5945  */
5946 DUCKDB_C_API DUCKDB_V2_ERROR duckdb_v2_connection_describe_table(duckdb_v2_connection_handle conn,
5947                                                                  duckdb_v2_qname_handle name,
5948                                                                  duckdb_v2_table_description_handle *desc,
5949                                                                  duckdb_v2_error_info_handle *err);
```

[Pinned lines 5954–5958](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/include/duckdb_v2.h#L5954-L5958)

```cpp
5954  * Returns the resolved qualified name of the described table.
5955  *
5956  * Returns an owned copy of the fully resolved name: the catalog, schema, and table the lookup landed on, with the
5957  * casing the table was created with, never an echo of the requested name. Rendering it produces SQL that pins the
5958  * described table regardless of search path.
```


## src/main/capi/v2/capi_v2_catalog.cpp

[Pinned lines 13–40](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v2/capi_v2_catalog.cpp#L13-L40)

```cpp
13 DUCKDB_V2_ERROR duckdb_v2_connection_describe_table(duckdb_v2_connection_handle conn, duckdb_v2_qname_handle name,
14                                                     duckdb_v2_table_description_handle *desc,
15                                                     duckdb_v2_error_info_handle *err) {
16 	DUCKDB_CHECK_ARG(conn);
17 	DUCKDB_CHECK_ARG(name);
18 	DUCKDB_CHECK_ARG(desc);
19 	*desc = nullptr;
20 	return WithErrorHandler(err, [&]() {
21 		auto &context = *Convert(conn)->context;
22 		auto &qname = *Convert(name);
23 		auto &path = qname.Path();
24 		// The qname invariant guarantees one to three non-empty parts. A two-part name is read as SQL reads it: the
25 		// first part tries as a schema and as an attached database, and BindSchemaOrCatalog rejects the ambiguous case.
26 		auto catalog = duckdb::Identifier::InvalidCatalog();
27 		auto schema = duckdb::Identifier::InvalidSchema();
28 		if (path.size() == 3) {
29 			catalog = path[0];
30 			schema = path[1];
31 		} else if (path.size() == 2) {
32 			schema = path[0];
33 			// The attached-database lookup reads catalog state and needs a transaction.
34 			context.RunFunctionInTransaction([&]() { duckdb::Binder::BindSchemaOrCatalog(context, catalog, schema); });
35 		}
36 		auto description = context.TableInfo(catalog, schema, path.back());
37 		if (!description) {
38 			throw duckdb::CatalogException("Table with name %s does not exist!", qname.ToString());
39 		}
40 		*desc = Convert(description.release());
```


## src/main/capi/v1/catalog-c.cpp

[Pinned lines 80–98](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v1/catalog-c.cpp#L80-L98)

```cpp
80 duckdb_catalog duckdb_client_context_get_catalog(duckdb_client_context context, const char *name) {
81 	if (!context || !name || strlen(name) == 0) {
82 		return nullptr;
83 	}
84 
85 	auto &context_ref = *reinterpret_cast<duckdb::CClientContextWrapper *>(context);
86 	if (!context_ref.context.transaction.HasActiveTransaction()) {
87 		return nullptr;
88 	}
89 
90 	auto catalog_ptr = duckdb::Catalog::GetCatalogEntry(context_ref.context, duckdb::Identifier(name));
91 
92 	if (!catalog_ptr) {
93 		return nullptr;
94 	}
95 
96 	auto &catalog_ref = *catalog_ptr;
97 	auto catalog_wrapper = new duckdb::CCatalogWrapper(catalog_ref, catalog_ref.GetCatalogType());
98 	return reinterpret_cast<duckdb_catalog>(catalog_wrapper);
```

[Pinned lines 118–136](https://github.com/duckdb/duckdb/blob/d54cbbe3df17e8e5ce68312f483b4155836112aa/src/main/capi/v1/catalog-c.cpp#L118-L136)

```cpp
118 duckdb_catalog_entry duckdb_catalog_get_entry(duckdb_catalog catalog, duckdb_client_context context,
119                                               duckdb_catalog_entry_type entry_type, const char *schema_name,
120                                               const char *entry_name) {
121 	if (!catalog || !context || !schema_name || !entry_name) {
122 		return nullptr;
123 	}
124 
125 	auto &catalog_ref = *reinterpret_cast<duckdb::CCatalogWrapper *>(catalog);
126 	auto &context_ref = *reinterpret_cast<duckdb::CClientContextWrapper *>(context);
127 
128 	auto entry = catalog_ref.catalog.GetEntry(context_ref.context, duckdb::CatalogTypeFromC(entry_type),
129 	                                          duckdb::Identifier(schema_name), duckdb::Identifier(entry_name),
130 	                                          duckdb::OnEntryNotFound::RETURN_NULL);
131 
132 	if (!entry) {
133 		return nullptr;
134 	}
135 
136 	return reinterpret_cast<duckdb_catalog_entry>(new duckdb::CCatalogEntryWrapper(*entry));
```


