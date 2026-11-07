// SPDX-License-Identifier: MIT
#pragma once
#include <functional>
namespace duckdb {class ExtensionLoader;class ClientContext;}
void RegisterNativeWriter(duckdb::ExtensionLoader &,
    std::function<void(duckdb::ClientContext &)> validate_bootstrap);
