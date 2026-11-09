import { Attribute, EntityId, TripleId } from "./Branded.js";
import { Schema } from "effect";
import * as _$effect_Brand0 from "effect/Brand";
import * as _$effect_Effect0 from "effect/Effect";

//#region src/Triple.d.ts
declare const TripleInput: Schema.Struct<{
  readonly entityId: Schema.brand<Schema.String, "EntityId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
  };
  readonly attribute: Schema.String;
  readonly value: Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"string">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"number">;
    readonly value: Schema.Number;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"boolean">;
    readonly value: Schema.Boolean;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"datetime">;
    readonly value: Schema.Number;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.brand<Schema.String, "EntityId"> & {
      decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
    };
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"json">;
    readonly value: Schema.Unknown;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"blob">;
    readonly value: Schema.String;
    readonly mimeType: Schema.String;
    readonly size: Schema.Number;
    readonly filename: Schema.optional<Schema.String>;
  }>]>;
  readonly entityType: Schema.optional<Schema.String>;
  readonly createdBy: Schema.optional<Schema.String>;
  readonly validFrom: Schema.optional<Schema.Number>;
  readonly validTo: Schema.optional<Schema.Number>;
}>;
type TripleInput = typeof TripleInput.Type;
declare const QueryRequest: Schema.Struct<{
  readonly entityId: Schema.optional<Schema.brand<Schema.String, "EntityId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
  }>;
  readonly attribute: Schema.optional<Schema.String>;
  readonly entityType: Schema.optional<Schema.String>;
  readonly value: Schema.optional<Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"string">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"number">;
    readonly value: Schema.Number;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"boolean">;
    readonly value: Schema.Boolean;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"datetime">;
    readonly value: Schema.Number;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.brand<Schema.String, "EntityId"> & {
      decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
    };
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"json">;
    readonly value: Schema.Unknown;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"blob">;
    readonly value: Schema.String;
    readonly mimeType: Schema.String;
    readonly size: Schema.Number;
    readonly filename: Schema.optional<Schema.String>;
  }>]>>;
}>;
type QueryRequest = typeof QueryRequest.Type;
declare const QueryAsOfRequest: Schema.Struct<{
  readonly entityId: Schema.optional<Schema.brand<Schema.String, "EntityId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
  }>;
  readonly attribute: Schema.optional<Schema.String>;
  readonly entityType: Schema.optional<Schema.String>;
  readonly value: Schema.optional<Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"string">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"number">;
    readonly value: Schema.Number;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"boolean">;
    readonly value: Schema.Boolean;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"datetime">;
    readonly value: Schema.Number;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.brand<Schema.String, "EntityId"> & {
      decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
    };
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"json">;
    readonly value: Schema.Unknown;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"blob">;
    readonly value: Schema.String;
    readonly mimeType: Schema.String;
    readonly size: Schema.Number;
    readonly filename: Schema.optional<Schema.String>;
  }>]>>;
  readonly asOf: Schema.Number;
}>;
type QueryAsOfRequest = typeof QueryAsOfRequest.Type;
declare const AssertTripleRequest: Schema.Union<readonly [Schema.Struct<{
  readonly entityId: Schema.brand<Schema.String, "EntityId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
  };
  readonly attribute: Schema.String;
  readonly value: Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"string">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"number">;
    readonly value: Schema.Number;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"boolean">;
    readonly value: Schema.Boolean;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"datetime">;
    readonly value: Schema.Number;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.brand<Schema.String, "EntityId"> & {
      decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
    };
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"json">;
    readonly value: Schema.Unknown;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"blob">;
    readonly value: Schema.String;
    readonly mimeType: Schema.String;
    readonly size: Schema.Number;
    readonly filename: Schema.optional<Schema.String>;
  }>]>;
  readonly entityType: Schema.optional<Schema.String>;
  readonly createdBy: Schema.optional<Schema.String>;
  readonly validFrom: Schema.optional<Schema.Number>;
  readonly validTo: Schema.optional<Schema.Number>;
}>, Schema.$Array<Schema.Struct<{
  readonly entityId: Schema.brand<Schema.String, "EntityId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
  };
  readonly attribute: Schema.String;
  readonly value: Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"string">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"number">;
    readonly value: Schema.Number;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"boolean">;
    readonly value: Schema.Boolean;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"datetime">;
    readonly value: Schema.Number;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.brand<Schema.String, "EntityId"> & {
      decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
    };
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"json">;
    readonly value: Schema.Unknown;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"blob">;
    readonly value: Schema.String;
    readonly mimeType: Schema.String;
    readonly size: Schema.Number;
    readonly filename: Schema.optional<Schema.String>;
  }>]>;
  readonly entityType: Schema.optional<Schema.String>;
  readonly createdBy: Schema.optional<Schema.String>;
  readonly validFrom: Schema.optional<Schema.Number>;
  readonly validTo: Schema.optional<Schema.Number>;
}>>]>;
type AssertTripleRequest = typeof AssertTripleRequest.Type;
declare const RetractResponse: Schema.Struct<{
  readonly retracted: Schema.Number;
}>;
type RetractResponse = typeof RetractResponse.Type;
declare const TripleResponse: Schema.Struct<{
  readonly id: Schema.brand<Schema.String, "TripleId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"TripleId">, Schema.SchemaError, never>;
  };
  readonly entityId: Schema.brand<Schema.String, "EntityId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
  };
  readonly attribute: Schema.String;
  readonly value: Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"string">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"number">;
    readonly value: Schema.Number;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"boolean">;
    readonly value: Schema.Boolean;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"datetime">;
    readonly value: Schema.Number;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.brand<Schema.String, "EntityId"> & {
      decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
    };
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"json">;
    readonly value: Schema.Unknown;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"blob">;
    readonly value: Schema.String;
    readonly mimeType: Schema.String;
    readonly size: Schema.Number;
    readonly filename: Schema.optional<Schema.String>;
  }>]>;
  readonly recordedAt: Schema.Number;
  readonly validFrom: Schema.Number;
  readonly validTo: Schema.NullOr<Schema.Number>;
  readonly createdBy: Schema.NullOr<Schema.String>;
  readonly retractedAt: Schema.NullOr<Schema.Number>;
  readonly entityType: Schema.NullOr<Schema.String>;
  readonly schemaVersion: Schema.NullOr<Schema.Number>;
  readonly txId: Schema.NullOr<Schema.brand<Schema.brand<Schema.String, "EntityId">, "TransactionId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId"> & _$effect_Brand0.Brand<"TransactionId">, Schema.SchemaError, never>;
  }>;
  readonly retractTxId: Schema.NullOr<Schema.brand<Schema.brand<Schema.String, "EntityId">, "TransactionId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId"> & _$effect_Brand0.Brand<"TransactionId">, Schema.SchemaError, never>;
  }>;
}>;
type TripleResponse = typeof TripleResponse.Type;
declare const Triple: Schema.Struct<{
  readonly id: Schema.brand<Schema.String, "TripleId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"TripleId">, Schema.SchemaError, never>;
  };
  readonly entityId: Schema.brand<Schema.String, "EntityId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
  };
  readonly attribute: Schema.brand<Schema.String, "Attribute">;
  readonly value: Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"string">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"number">;
    readonly value: Schema.Number;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"boolean">;
    readonly value: Schema.Boolean;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"datetime">;
    readonly value: Schema.Number;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.brand<Schema.String, "EntityId"> & {
      decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
    };
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"json">;
    readonly value: Schema.Unknown;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"blob">;
    readonly value: Schema.String;
    readonly mimeType: Schema.String;
    readonly size: Schema.Number;
    readonly filename: Schema.optional<Schema.String>;
  }>]>;
  readonly recordedAt: Schema.Number;
  readonly validFrom: Schema.Number;
  readonly validTo: Schema.OptionFromOptional<Schema.Number>;
  readonly createdBy: Schema.OptionFromOptional<Schema.String>;
  readonly retractedAt: Schema.OptionFromOptional<Schema.Number>;
  readonly entityType: Schema.OptionFromOptional<Schema.String>;
  readonly schemaVersion: Schema.OptionFromOptional<Schema.Number>;
  readonly txId: Schema.OptionFromOptional<Schema.brand<Schema.brand<Schema.String, "EntityId">, "TransactionId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId"> & _$effect_Brand0.Brand<"TransactionId">, Schema.SchemaError, never>;
  }>;
  readonly retractTxId: Schema.OptionFromOptional<Schema.brand<Schema.brand<Schema.String, "EntityId">, "TransactionId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId"> & _$effect_Brand0.Brand<"TransactionId">, Schema.SchemaError, never>;
  }>;
}>;
type Triple = typeof Triple.Type;
declare const TripleRow: Schema.Struct<{
  readonly id: Schema.String;
  readonly entity_id: Schema.String;
  readonly attribute: Schema.String;
  readonly value_type: Schema.String;
  readonly value_string: Schema.NullOr<Schema.String>;
  readonly value_number: Schema.NullOr<Schema.Number>;
  readonly value_boolean: Schema.NullOr<Schema.Number>;
  readonly value_datetime: Schema.NullOr<Schema.Number>;
  readonly value_json: Schema.NullOr<Schema.String>;
  readonly recorded_at: Schema.Number;
  readonly recorded_position: Schema.Number;
  readonly valid_from: Schema.Number;
  readonly valid_to: Schema.NullOr<Schema.Number>;
  readonly created_by: Schema.NullOr<Schema.String>;
  readonly retracted_at: Schema.NullOr<Schema.Number>;
  readonly retracted_position: Schema.NullOr<Schema.Number>;
  readonly retract_tx_id: Schema.NullOr<Schema.String>;
  readonly entity_type: Schema.NullOr<Schema.String>;
  readonly schema_version: Schema.NullOr<Schema.Number>;
  readonly tx_id: Schema.NullOr<Schema.String>;
}>;
type TripleRow = typeof TripleRow.Type;
declare const TransactAssertOp: Schema.Struct<{
  readonly op: Schema.Literal<"assert">;
  readonly entityId: Schema.brand<Schema.String, "EntityId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
  };
  readonly attribute: Schema.String;
  readonly value: Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"string">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"number">;
    readonly value: Schema.Number;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"boolean">;
    readonly value: Schema.Boolean;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"datetime">;
    readonly value: Schema.Number;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.brand<Schema.String, "EntityId"> & {
      decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
    };
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"json">;
    readonly value: Schema.Unknown;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"blob">;
    readonly value: Schema.String;
    readonly mimeType: Schema.String;
    readonly size: Schema.Number;
    readonly filename: Schema.optional<Schema.String>;
  }>]>;
  readonly entityType: Schema.optional<Schema.String>;
  readonly createdBy: Schema.optional<Schema.String>;
  readonly validFrom: Schema.optional<Schema.Number>;
  readonly validTo: Schema.optional<Schema.Number>;
}>;
type TransactAssertOp = typeof TransactAssertOp.Type;
declare const TransactRetractOp: Schema.Struct<{
  readonly op: Schema.Literal<"retract">;
  readonly id: Schema.brand<Schema.String, "TripleId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"TripleId">, Schema.SchemaError, never>;
  };
}>;
type TransactRetractOp = typeof TransactRetractOp.Type;
declare const TransactRetractPatternOp: Schema.Struct<{
  readonly op: Schema.Literal<"retract-pattern">;
  readonly pattern: Schema.Struct<{
    readonly entityId: Schema.optional<Schema.brand<Schema.String, "EntityId"> & {
      decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
    }>;
    readonly attribute: Schema.optional<Schema.String>;
    readonly entityType: Schema.optional<Schema.String>;
    readonly value: Schema.optional<Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"string">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"number">;
      readonly value: Schema.Number;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"boolean">;
      readonly value: Schema.Boolean;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"datetime">;
      readonly value: Schema.Number;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.brand<Schema.String, "EntityId"> & {
        decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
      };
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"json">;
      readonly value: Schema.Unknown;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"blob">;
      readonly value: Schema.String;
      readonly mimeType: Schema.String;
      readonly size: Schema.Number;
      readonly filename: Schema.optional<Schema.String>;
    }>]>>;
  }>;
}>;
type TransactRetractPatternOp = typeof TransactRetractPatternOp.Type;
declare const TransactOp: Schema.Union<readonly [Schema.Struct<{
  readonly op: Schema.Literal<"assert">;
  readonly entityId: Schema.brand<Schema.String, "EntityId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
  };
  readonly attribute: Schema.String;
  readonly value: Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"string">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"number">;
    readonly value: Schema.Number;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"integer">;
    readonly value: Schema.String;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"boolean">;
    readonly value: Schema.Boolean;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"datetime">;
    readonly value: Schema.Number;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"ref">;
    readonly value: Schema.brand<Schema.String, "EntityId"> & {
      decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
    };
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"json">;
    readonly value: Schema.Unknown;
  }>, Schema.Struct<{
    readonly type: Schema.Literal<"blob">;
    readonly value: Schema.String;
    readonly mimeType: Schema.String;
    readonly size: Schema.Number;
    readonly filename: Schema.optional<Schema.String>;
  }>]>;
  readonly entityType: Schema.optional<Schema.String>;
  readonly createdBy: Schema.optional<Schema.String>;
  readonly validFrom: Schema.optional<Schema.Number>;
  readonly validTo: Schema.optional<Schema.Number>;
}>, Schema.Struct<{
  readonly op: Schema.Literal<"retract">;
  readonly id: Schema.brand<Schema.String, "TripleId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"TripleId">, Schema.SchemaError, never>;
  };
}>, Schema.Struct<{
  readonly op: Schema.Literal<"retract-pattern">;
  readonly pattern: Schema.Struct<{
    readonly entityId: Schema.optional<Schema.brand<Schema.String, "EntityId"> & {
      decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
    }>;
    readonly attribute: Schema.optional<Schema.String>;
    readonly entityType: Schema.optional<Schema.String>;
    readonly value: Schema.optional<Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"string">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"number">;
      readonly value: Schema.Number;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"boolean">;
      readonly value: Schema.Boolean;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"datetime">;
      readonly value: Schema.Number;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.brand<Schema.String, "EntityId"> & {
        decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
      };
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"json">;
      readonly value: Schema.Unknown;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"blob">;
      readonly value: Schema.String;
      readonly mimeType: Schema.String;
      readonly size: Schema.Number;
      readonly filename: Schema.optional<Schema.String>;
    }>]>>;
  }>;
}>]>;
type TransactOp = typeof TransactOp.Type;
declare const TripleLivePrecondition: Schema.Struct<{
  readonly _tag: Schema.Literal<"TripleLive">;
  readonly id: Schema.brand<Schema.String, "TripleId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"TripleId">, Schema.SchemaError, never>;
  };
}>;
declare const EntityStatePrecondition: Schema.Struct<{
  readonly _tag: Schema.Literal<"EntityState">;
  readonly entityId: Schema.brand<Schema.String, "EntityId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
  }; /** The complete set of live fact identities observed before constructing the transaction. */
  readonly tripleIds: Schema.$Array<Schema.brand<Schema.String, "TripleId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"TripleId">, Schema.SchemaError, never>;
  }>;
}>;
declare const TransactionPrecondition: Schema.Union<readonly [Schema.Struct<{
  readonly _tag: Schema.Literal<"TripleLive">;
  readonly id: Schema.brand<Schema.String, "TripleId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"TripleId">, Schema.SchemaError, never>;
  };
}>, Schema.Struct<{
  readonly _tag: Schema.Literal<"EntityState">;
  readonly entityId: Schema.brand<Schema.String, "EntityId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
  }; /** The complete set of live fact identities observed before constructing the transaction. */
  readonly tripleIds: Schema.$Array<Schema.brand<Schema.String, "TripleId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"TripleId">, Schema.SchemaError, never>;
  }>;
}>]>;
type TransactionPrecondition = typeof TransactionPrecondition.Type;
declare const TransactRequest: Schema.Struct<{
  readonly operations: Schema.$Array<Schema.Union<readonly [Schema.Struct<{
    readonly op: Schema.Literal<"assert">;
    readonly entityId: Schema.brand<Schema.String, "EntityId"> & {
      decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
    };
    readonly attribute: Schema.String;
    readonly value: Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"string">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"number">;
      readonly value: Schema.Number;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"boolean">;
      readonly value: Schema.Boolean;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"datetime">;
      readonly value: Schema.Number;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.brand<Schema.String, "EntityId"> & {
        decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
      };
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"json">;
      readonly value: Schema.Unknown;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"blob">;
      readonly value: Schema.String;
      readonly mimeType: Schema.String;
      readonly size: Schema.Number;
      readonly filename: Schema.optional<Schema.String>;
    }>]>;
    readonly entityType: Schema.optional<Schema.String>;
    readonly createdBy: Schema.optional<Schema.String>;
    readonly validFrom: Schema.optional<Schema.Number>;
    readonly validTo: Schema.optional<Schema.Number>;
  }>, Schema.Struct<{
    readonly op: Schema.Literal<"retract">;
    readonly id: Schema.brand<Schema.String, "TripleId"> & {
      decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"TripleId">, Schema.SchemaError, never>;
    };
  }>, Schema.Struct<{
    readonly op: Schema.Literal<"retract-pattern">;
    readonly pattern: Schema.Struct<{
      readonly entityId: Schema.optional<Schema.brand<Schema.String, "EntityId"> & {
        decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
      }>;
      readonly attribute: Schema.optional<Schema.String>;
      readonly entityType: Schema.optional<Schema.String>;
      readonly value: Schema.optional<Schema.Union<readonly [Schema.Struct<{
        readonly type: Schema.Literal<"string">;
        readonly value: Schema.String;
      }>, Schema.Struct<{
        readonly type: Schema.Literal<"number">;
        readonly value: Schema.Number;
      }>, Schema.Struct<{
        readonly type: Schema.Literal<"integer">;
        readonly value: Schema.String;
      }>, Schema.Struct<{
        readonly type: Schema.Literal<"boolean">;
        readonly value: Schema.Boolean;
      }>, Schema.Struct<{
        readonly type: Schema.Literal<"datetime">;
        readonly value: Schema.Number;
      }>, Schema.Struct<{
        readonly type: Schema.Literal<"ref">;
        readonly value: Schema.brand<Schema.String, "EntityId"> & {
          decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
        };
      }>, Schema.Struct<{
        readonly type: Schema.Literal<"json">;
        readonly value: Schema.Unknown;
      }>, Schema.Struct<{
        readonly type: Schema.Literal<"blob">;
        readonly value: Schema.String;
        readonly mimeType: Schema.String;
        readonly size: Schema.Number;
        readonly filename: Schema.optional<Schema.String>;
      }>]>>;
    }>;
  }>]>>;
  readonly meta: Schema.optional<Schema.Struct<{
    readonly actor: Schema.optional<Schema.String>;
    readonly commandId: Schema.optional<Schema.String>;
    readonly correlationId: Schema.optional<Schema.String>;
    readonly causationId: Schema.optional<Schema.String>;
    readonly configSnapshot: Schema.optional<Schema.String>;
    readonly enforce: Schema.optional<Schema.Struct<{
      readonly constraints: Schema.$Array<Schema.Union<readonly [Schema.Struct<{
        readonly _tag: Schema.Literal<"Required">;
        readonly v: Schema.Literal<1>;
        readonly entityType: Schema.String;
        readonly attribute: Schema.String;
      }>, Schema.Struct<{
        readonly _tag: Schema.Literal<"Cardinality">;
        readonly v: Schema.Literal<1>;
        readonly entityType: Schema.String;
        readonly attribute: Schema.String;
        readonly max: Schema.Number;
      }>, Schema.Struct<{
        readonly _tag: Schema.Literal<"Unique">;
        readonly v: Schema.Literal<1>;
        readonly entityType: Schema.String;
        readonly attribute: Schema.String;
      }>, Schema.Struct<{
        readonly _tag: Schema.Literal<"ReferenceTarget">;
        readonly v: Schema.Literal<1>;
        readonly entityType: Schema.String;
        readonly attribute: Schema.String;
        readonly targetEntityType: Schema.String;
      }>]>>;
    }>>;
    readonly preconditions: Schema.optional<Schema.$Array<Schema.Union<readonly [Schema.Struct<{
      readonly _tag: Schema.Literal<"TripleLive">;
      readonly id: Schema.brand<Schema.String, "TripleId"> & {
        decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"TripleId">, Schema.SchemaError, never>;
      };
    }>, Schema.Struct<{
      readonly _tag: Schema.Literal<"EntityState">;
      readonly entityId: Schema.brand<Schema.String, "EntityId"> & {
        decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
      }; /** The complete set of live fact identities observed before constructing the transaction. */
      readonly tripleIds: Schema.$Array<Schema.brand<Schema.String, "TripleId"> & {
        decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"TripleId">, Schema.SchemaError, never>;
      }>;
    }>]>>>;
  }>>;
}>;
type TransactRequest = typeof TransactRequest.Type;
declare const TransactResponse: Schema.Struct<{
  readonly txId: Schema.brand<Schema.brand<Schema.String, "EntityId">, "TransactionId"> & {
    decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId"> & _$effect_Brand0.Brand<"TransactionId">, Schema.SchemaError, never>;
  };
  readonly asserted: Schema.$Array<Schema.Struct<{
    readonly id: Schema.brand<Schema.String, "TripleId"> & {
      decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"TripleId">, Schema.SchemaError, never>;
    };
    readonly entityId: Schema.brand<Schema.String, "EntityId"> & {
      decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
    };
    readonly attribute: Schema.String;
    readonly value: Schema.Union<readonly [Schema.Struct<{
      readonly type: Schema.Literal<"string">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"number">;
      readonly value: Schema.Number;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"integer">;
      readonly value: Schema.String;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"boolean">;
      readonly value: Schema.Boolean;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"datetime">;
      readonly value: Schema.Number;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"ref">;
      readonly value: Schema.brand<Schema.String, "EntityId"> & {
        decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId">, Schema.SchemaError, never>;
      };
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"json">;
      readonly value: Schema.Unknown;
    }>, Schema.Struct<{
      readonly type: Schema.Literal<"blob">;
      readonly value: Schema.String;
      readonly mimeType: Schema.String;
      readonly size: Schema.Number;
      readonly filename: Schema.optional<Schema.String>;
    }>]>;
    readonly recordedAt: Schema.Number;
    readonly validFrom: Schema.Number;
    readonly validTo: Schema.NullOr<Schema.Number>;
    readonly createdBy: Schema.NullOr<Schema.String>;
    readonly retractedAt: Schema.NullOr<Schema.Number>;
    readonly entityType: Schema.NullOr<Schema.String>;
    readonly schemaVersion: Schema.NullOr<Schema.Number>;
    readonly txId: Schema.NullOr<Schema.brand<Schema.brand<Schema.String, "EntityId">, "TransactionId"> & {
      decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId"> & _$effect_Brand0.Brand<"TransactionId">, Schema.SchemaError, never>;
    }>;
    readonly retractTxId: Schema.NullOr<Schema.brand<Schema.brand<Schema.String, "EntityId">, "TransactionId"> & {
      decode: (s: string) => _$effect_Effect0.Effect<string & _$effect_Brand0.Brand<"EntityId"> & _$effect_Brand0.Brand<"TransactionId">, Schema.SchemaError, never>;
    }>;
  }>>;
  readonly retracted: Schema.Number;
}>;
type TransactResponse = typeof TransactResponse.Type;
declare const queryToPattern: (query: QueryRequest) => {
  value?: {
    readonly type: "string";
    readonly value: string;
  } | {
    readonly type: "number";
    readonly value: number;
  } | {
    readonly type: "integer";
    readonly value: string;
  } | {
    readonly type: "boolean";
    readonly value: boolean;
  } | {
    readonly type: "datetime";
    readonly value: number;
  } | {
    readonly type: "ref";
    readonly value: string & _$effect_Brand0.Brand<"EntityId">;
  } | {
    readonly type: "json";
    readonly value: unknown;
  } | {
    readonly type: "blob";
    readonly value: string;
    readonly mimeType: string;
    readonly size: number;
    readonly filename?: string | undefined;
  };
  entityType?: string;
  attribute?: string;
  entityId?: string & _$effect_Brand0.Brand<"EntityId">;
};
//#endregion
export { AssertTripleRequest, Attribute, EntityId, EntityStatePrecondition, QueryAsOfRequest, QueryRequest, RetractResponse, TransactAssertOp, TransactOp, TransactRequest, TransactResponse, TransactRetractOp, TransactRetractPatternOp, TransactionPrecondition, Triple, TripleId, TripleInput, TripleLivePrecondition, TripleResponse, TripleRow, queryToPattern };
//# sourceMappingURL=Triple.d.ts.map