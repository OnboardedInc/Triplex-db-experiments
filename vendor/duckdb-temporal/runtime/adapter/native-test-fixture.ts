import {fileURLToPath} from 'node:url';
import type {DuckDBConnection} from '@duckdb/node-api';
import {NativeDuckDBPort} from './native-duckdb-port.mjs';

/** Actual audited SQL transport for tests of native PRAGMAs outside the store. */
export async function openAuditedPort(options?:Parameters<typeof NativeDuckDBPort.open>[0]){
  const port=await NativeDuckDBPort.openWithOwner(options);
  try{await port.activateOwnership();return port;}
  catch(error){await port.close();throw error;}
}

/** Test-only direct SDK setup for multi-connection and stream fault fixtures. */
export async function activateEngineOwner(...connections:DuckDBConnection[]){
  const [writer]=connections;
  if(!writer)throw new Error('Missing test writer');
  const companion=new URL('../owner_probe/temporal_owner_probe.duckdb_extension',import.meta.url);
  await writer.run("LOAD '"+fileURLToPath(companion).replaceAll("'","''")+"'");
  for(const connection of connections)await connection.run('SELECT system.main.td_owner_probe_enroll()');
  await writer.run('SELECT system.main.td_owner_probe_activate(0)');
}
