"""Build identical native source with borrowed schema inputs off/on and compare."""
import shutil
import subprocess

from build_native import ROOT, main as build


def main():
    build(ROOT / 'build/schema-view-before', schema_borrowed_input=False)
    build()
    (ROOT / 'build/adapter').mkdir(exist_ok=True, parents=True)
    shutil.copyfile(ROOT / 'adapter/benchmark-schema-views.mjs', ROOT / 'build/adapter/benchmark-schema-views.mjs')
    subprocess.run(['node', ROOT / 'build/adapter/benchmark-schema-views.mjs'], cwd=ROOT, check=True)


if __name__ == '__main__':
    main()
