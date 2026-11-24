# [DX-RD5] Summarize probe.ndjson (probe.clj): per label, the layout walk and, per arm, storage gets, loads and CPU per
# subject, reads/s of the closed loop. Counts exact; times diagnostic (Mac).
#   python3 summarize.py OUT/probe.ndjson
import json, sys, collections
rows = [json.loads(l) for l in open(sys.argv[1])]
labels = list(dict.fromkeys(r["label"] for r in rows))
for lab in labels:
    rs = [r for r in rows if r["label"] == lab]
    start = next(r for r in rs if r["kind"] == "start")
    print(f"== {lab}: readAheadPool={start['readAheadPool']} prefetch={start['prefetch']} permits={start['permits']} cache={start['objectCacheMax']}")
    for r in rs:
        if r["kind"] == "layout":
            io = r["io"]
            print("  layout: entities %d datoms %d rows %d rowChars %d eavtLeaves %d storageGets %s datoms/leaf %.0f rowChars/leaf %.0f readSubjects/leaf %.3f readSubjectRowChars/subject %.0f readSubjectRows/subject %.1f allocMB/leaf %.2f" % (
                r["entities"], r["datoms"], r["rows"], r["rowChars"], r["eavtLeaves"], r.get("storageGets"), r["datomsPerLeaf"], r["rowCharsPerLeaf"],
                r["readSubjectsPerLeaf"], r["readSubjectRowChars"] / r["readSubjects"], r["readSubjectRows"] / r["readSubjects"], r["allocMB"] / max(1, r["eavtLeaves"])))
        if r["kind"] == "arm":
            n = r["subjects"]; io = r["io"]
            g = lambda k: io.get(k, 0) / n
            line = "  %-10s subjects %6d  gets/subj(io) %.3f eavt-load %.3f avet-load %.3f aevt-load %.3f  pgGets/subj %s  cpu ms/subj %.3f  gc ms/subj %.3f  sql-ms/get %.3f deser-ms/seg %.3f" % (
                r["arm"], n, g("sql"), g("eavt-load"), g("avet-load"), g("aevt-load"),
                ("%.3f" % (r["storageGets"] / n)) if r.get("storageGets") is not None else "-",
                r["processCpuMs"] / n, r["gcMs"] / n, io.get("sql-ms", 0) / max(1, io.get("sql", 0)), io.get("deserialize-ms", 0) / max(1, io.get("deserialize", 0)))
            if r["arm"] == "concurrent": line += "  reads/s %.0f" % r["readsPerSecond"]
            print(line)
    single = [r for r in rs if r["kind"] == "read" and r["arm"] == "single"]
    if single:
        c = collections.Counter(r["io"].get("eavt-load", 0) for r in single)
        print("  single eavt-load distribution:", dict(sorted(c.items())), " wall p50 %.2f ms" % sorted(r["wallMs"] for r in single)[len(single)//2],
              " alloc MB/read %.2f" % (sum(r["allocMB"] for r in single) / len(single)))
    b8 = [r for r in rs if r["kind"] == "read" and r["arm"] == "batch8"]
    if b8:
        w = sorted(r["wallMs"] for r in b8)
        print("  batch8 exchange wall p50 %.2f ms, mean thread CPU %.2f ms, mean sql-ms %.2f" % (w[len(w)//2], sum(r["threadCpuMs"] for r in b8)/len(b8), sum(r["io"].get("sql-ms",0) for r in b8)/len(b8)))
