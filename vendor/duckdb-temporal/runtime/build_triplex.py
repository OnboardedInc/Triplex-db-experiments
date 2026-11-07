"""Reproduce the exact-source upstream packages and the adapter build.

Network acquisition is explicit: official GitHub source plus npm ci using the
committed registry-integrity lock. No upstream source contract is patched.
"""
from pathlib import Path
import argparse
import shutil
import subprocess

ROOT=Path(__file__).resolve().parent
REV='e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0'


def run(args,cwd=ROOT):
    subprocess.run([str(x) for x in args],cwd=cwd,check=True)


def link(path,target):
    if path.is_symlink() and path.resolve()==target.resolve():return
    if path.exists() or path.is_symlink():raise RuntimeError('existing dependency link differs; preserve it and select a clean build directory')
    path.parent.mkdir(parents=True,exist_ok=True)
    path.symlink_to(target.resolve(),target_is_directory=True)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--deps-dir',type=Path)
    parser.add_argument('--source-dir',type=Path)
    parser.add_argument('--offline',action='store_true')
    args=parser.parse_args()
    build=ROOT/'build';build.mkdir(exist_ok=True)
    deps=(args.deps_dir or build/'deps').resolve();deps.mkdir(exist_ok=True)
    for name in ('package.json','package-lock.json'):
        shutil.copyfile(ROOT/'adapter/build-deps'/name,deps/name)
    run(['npm','ci','--ignore-scripts','--no-audit',*(['--offline'] if args.offline else [])],deps)
    source=(args.source_dir or build/'triplex-source').resolve()
    if not source.exists():run(['git','clone','https://github.com/bjacobso/triplex.git',source])
    run(['git','checkout','--detach',REV],source)
    if subprocess.check_output(['git','rev-parse','HEAD'],cwd=source,text=True).strip()!=REV:
        raise RuntimeError('upstream revision mismatch')
    if subprocess.check_output(['git','diff','--name-only',REV],cwd=source):
        raise RuntimeError('upstream tracked source differs')
    modules=deps/'node_modules'
    link(source/'node_modules',modules)
    for name,package in [('triplex','core'),('triplex-testkit','testkit'),('triplex-sql','sql')]:
        link(modules/'@triplex-build'/name,source/'packages'/package)
    for package in ('core','testkit','sql'):
        run([modules/'.bin/tsdown','--logLevel','error'],source/'packages'/package)
    run([modules/'.bin/tsc','--declaration','--emitDeclarationOnly','--rootDir','src','--outDir','dist'],source/'packages/sql')
    link(ROOT/'node_modules',modules)
    run([modules/'.bin/tsc','--pretty','false'])
    for pattern in ('*.mjs','*.sql'):
        for path in (ROOT/'adapter').glob(pattern):shutil.copyfile(path,build/'adapter'/path.name)
    print('Exact-source Triplex core/testkit/sql and adapter built')


if __name__=='__main__':main()
