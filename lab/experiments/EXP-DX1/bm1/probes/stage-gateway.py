"""Stage the W1 write gateway with measured helper bodies for GROWTH probe 1."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys


def stage(repo, dest, source):
    assert subprocess.check_output(["git","rev-parse","HEAD"],cwd=repo,text=True).strip()==source
    assert not subprocess.check_output(["git","diff","--name-only","HEAD"],cwd=repo)
    gateway=Path(repo)/"packages/datomic/gateway"
    shutil.copytree(gateway,dest)
    shutil.copyfile(Path(repo)/"packages/datomic/src/codec-spec.json",Path(dest)/"codec-spec.json")
    source_files={}
    def replace(text,old,new):
        if text.count(old)!=1:raise ValueError("Builder source changed at "+old)
        return text.replace(old,new)
    fragment=Path(__file__).with_name("storage-code.clj").read_text()
    for name in ("commit","storage"):
        file=Path(dest)/"src/triplex/gateway"/(name+".clj")
        text=file.read_text()
        before=hashlib.sha256(text.encode()).hexdigest()
        if name=="commit":
            text=replace(text,"(def code (instrument-code (expand-code",fragment+"\n(def code (bm1-instrument (instrument-code (expand-code")
            text=replace(text,"(def source-hash",")\n(def source-hash")
            text=replace(text,":requires '[[datomic.api :as d] [clojure.data.json :as json]]",
                    ":requires '[[datomic.api :as d] [clojure.data.json :as json] [datomic.measure.io-stats :as bmio]]")
        else:
            text=replace(text, "[[:triplex/commit (cond-> {:scope scope :source source",
                    '''[[:triplex/commit (cond-> {:scope scope :source source
                       :bm1-probe-id (let [id (get input "operationId")] (when (and (string? id) (.startsWith ^String id "bm1-")) id))''')
        file.write_text(text)
        source_files[name]={"original":before,"staged":hashlib.sha256(text.encode()).hexdigest()}
    return source_files


if __name__=="__main__":
    repo,dest,source=sys.argv[1:]
    print(json.dumps(stage(repo,dest,source),indent=2))
