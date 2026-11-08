// V-E01 check 3 T3: run claim.mjs qualify from a scratch copy of the evaluator, in its own process (as the CLI would).
// Usage: node t3-driver.mjs <copyDir> <repo> <claim.json> <workDir> <isolationRoot> <authorityRef>
// Prints {verdict, offlineVerdict, codes, exit}, exit being the CLI's exit code for that verdict (0 QUALIFIED, 2 otherwise).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [copy, repo, claimFile, workDir, isolationRoot, authorityRef] = process.argv.slice(2);
const { qualifyClaim, gitSource, localSut } = await import(pathToFileURL(path.join(copy, 'lab/bin/claim.mjs')).href);
const git = gitSource(repo);
const spec = JSON.parse(git.blob(git.resolve(authorityRef), 'lab/acceptance/obligations.json').toString('utf8')).buildSpec;
const r = qualifyClaim(JSON.parse(fs.readFileSync(claimFile, 'utf8')), { git, authorityRef, workDir, isolationRoot, sut: localSut(spec) });
process.stdout.write(JSON.stringify({ verdict: r.verdict, offlineVerdict: r.offlineVerdict, codes: r.reasons.map(x => x.code), exit: r.verdict === 'QUALIFIED' ? 0 : 2 }) + '\n');
