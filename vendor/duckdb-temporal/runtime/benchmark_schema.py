"""Rebuild the same native source with template reuse off/on, then compare."""
from pathlib import Path
import shutil
import subprocess

from build_native import main as build

ROOT=Path(__file__).resolve().parent


def main():
    build(ROOT/'build/schema-before',schema_template_reuse=False)
    build()
    (ROOT/'build/adapter').mkdir(exist_ok=True,parents=True)
    shutil.copyfile(ROOT/'adapter/benchmark-schema.mjs',ROOT/'build/adapter/benchmark-schema.mjs')
    subprocess.run(['node',ROOT/'build/adapter/benchmark-schema.mjs'],cwd=ROOT,check=True)


if __name__=='__main__':main()
