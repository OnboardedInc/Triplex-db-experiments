// [CX-VRQ01] Why: distinguish an empty response alone from the HE-6 flag-specific regression.
// Rejected: only testing eligible:false (could leave silent empty success untested).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { generateRouteHistory, runRouteEquivalence } from '../../../packages/testkit/src/route-equivalence.ts';
import { makeOfflineRouteFixture } from '../../../packages/testkit/src/offline-route-fixtures.ts';
const history = generateRouteHistory(42, 8);
const requests = [{ basis: { validAt: 2000, recordedPosition: 999999 } }];
const control = await runRouteEquivalence({ fixture: makeOfflineRouteFixture('qlever'), history, requests });
assert.deepEqual(control.violations, []);
const fixture = makeOfflineRouteFixture('qlever');
const first = fixture.routes[0];
const broken = { ...fixture, routes: fixture.routes.map(r => r === first ? { ...r, read: async request => ({ rows: [], taken: r.id, basis: request.basis }) } : r) };
const result = await runRouteEquivalence({ fixture: broken, history, requests });
assert(result.violations.some(v => v.rule === 'HE-3'));
assert(result.violations.some(v => v.rule === 'HE-1'));
assert(!result.violations.some(v => v.rule === 'HE-6'));
fs.writeFileSync('lab/verify/RQ01/run-a3/empty-without-flag.json', JSON.stringify({ control, broken: result }, null, 2) + '\n');
console.log(JSON.stringify({ controlViolations: 0, badEmptyCaught: true, violations: result.violations.length, rules: [...new Set(result.violations.map(v => v.rule))] }));
