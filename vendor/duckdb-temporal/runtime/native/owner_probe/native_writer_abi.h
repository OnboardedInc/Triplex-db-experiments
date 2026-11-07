// SPDX-License-Identifier: MIT
#pragma once
#include <stddef.h>
#include <stdint.h>
#ifdef __cplusplus
extern "C" {
#endif
typedef struct td_native_writer_handle td_native_writer_handle;
enum { TD_WRITER_ABI=1, TD_WRITER_NULL=0, TD_WRITER_BOOL=1, TD_WRITER_I64=2,
       TD_WRITER_F64=3, TD_WRITER_TEXT=4 };
typedef struct td_writer_cell {
    uint32_t tag;
    int64_t integer;
    double floating;
    const char *text;
    size_t length;
} td_writer_cell;
typedef struct td_writer_reply {
    uint32_t abi,closed,fatal,port_error,uncertain;
    int32_t error_type;
    const char *error;
    size_t error_length,rows,columns;
    const td_writer_cell *cells;
    uint64_t queue_ns,sql_ns,copy_ns,sequence,connection_id;
    void *owner;
} td_writer_reply;
typedef void (*td_writer_completion)(void *,td_writer_reply *);
typedef int (*td_writer_claim_fn)(uint64_t,td_native_writer_handle **,td_writer_reply **);
typedef int (*td_writer_submit_fn)(td_native_writer_handle *,const char *,size_t,
    const td_writer_cell *,size_t,td_writer_completion,void *,td_writer_reply **);
typedef int (*td_writer_close_fn)(td_native_writer_handle *,td_writer_completion,void *,td_writer_reply **);
typedef void (*td_writer_reply_release_fn)(td_writer_reply *);
typedef void (*td_writer_join_release_fn)(td_native_writer_handle *);
#ifdef __cplusplus
}
#endif
