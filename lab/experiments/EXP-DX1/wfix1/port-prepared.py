"""Resolve the prepared writer overlaps after merging the tested WFIX1 source."""
import re
from pathlib import Path
import subprocess
import sys

target, fixes, directory = sys.argv[1:]
gateway = "packages/datomic/gateway/src/triplex/gateway/"
root = Path(directory) / gateway


def before(file, revision):
    return subprocess.check_output(["git", "show", revision + ":" + gateway + file], text=True)


def once(text, old, new):
    assert text.count(old) == 1, old
    return text.replace(old, new, 1)


def between(text, start, end):
    return text[text.index(start):text.index(end, text.index(start))]


conflict = re.compile(r"^<<<<<<<[^\n]*\n(.*?)^=======\n(.*?)^>>>>>>>[^\n]*\n", re.M | re.S)
merge_tree = subprocess.run(
    ["git", "merge-tree", "--write-tree", target, fixes], capture_output=True, text=True
)
assert merge_tree.returncode == 1, merge_tree.stderr
tree = merge_tree.stdout.splitlines()[0]
inputs = {}
conflict_labels = re.compile(r"^(<<<<<<<|>>>>>>>).*?$", re.M)
for name in ("commit.clj", "group.clj", "group_prepare.clj"):
    actual = (root / name).read_text()
    expected = before(name, tree)
    assert conflict_labels.sub(r"\1", actual) == conflict_labels.sub(r"\1", expected), name
    inputs[name] = actual

fixed = before("commit.clj", fixes)
merge = inputs["commit.clj"]
# [DX-WFIX1] Why: keep the prepared branch's shared stamper and optional load instrumentation.
# Rejected: taking the ordinary writer file wholesale (the prepared renderer still uses its exports).
choices = iter((1, 1, 1))
commit = conflict.sub(lambda m: m[next(choices)], merge)
assert next(choices, None) is None
decoder = '''(def recorded-row-code
  '(fn [text]
     (let [[_ _ entity attr kind string number bool datetime data recorded from to _ entity-type _ tx]
           (lean-columns-code text)
           number-field (fn [x] (if (= "-0" x) -0.0 x))
           value {"type" kind "value" (case kind
                 ("ref" "integer" "string" "blob") string
                 "number" (number-field number)
                 "boolean" (not (zero? bool))
                 "datetime" (number-field datetime)
                 "json" (json/read-str data))}
           value (if (= "blob" kind) (merge (json/read-str data) value) value)]
       (cond-> {"entityId" entity "attribute" attr "value" value
                "recordedAt" (number-field recorded) "validFrom" (number-field from)}
         (some? to) (assoc "validTo" (number-field to))
         entity-type (assoc "entityType" entity-type)
         tx (assoc "assertionTxId" tx)))))

(defmacro recorded-row-decoder []
  (walk/postwalk-replace {'lean-columns-code slim/row-columns-code} recorded-row-code))
(def recorded-row (recorded-row-decoder))

'''
start, end = commit.index("(def recorded-row-code"), commit.index("(def stamp-code")
comments = commit.rfind(";; [DX-", start, end)
assert comments >= start
commit = commit[:start] + decoder + commit[comments:end] + commit[end:]
old_change = between(commit, "(assign-change [text", "(assign-row [text")
new_change = '''(assign-change [text clock new-ids prior-rows]
                 (let [change (json/read-str text)
                       id (get change "tripleId")
                       prior (when (and (= "retract" (get change "op")) (not (new-ids id)))
                               (get prior-rows id))
                       lean-prior (contains? prior "value")
                       change (cond-> change
                                lean-prior (dissoc "validTo" "entityType" "assertionTxId")
                                lean-prior (merge prior)
                                (and prior (not lean-prior)) (merge (select-keys prior (keys change)))
                                (new-ids id) (assoc "recordedAt" clock)
                                (or lean-prior (contains? change "retractedAt")) (assoc "retractedAt" clock))]
                   (json/write-str change)))
               '''
commit = once(commit, old_change, new_change)
packed = '''(let [clock-text (Double/toString (double clock))
                               fill #(apply str (interpose clock-text %))]
                           (str text (if (= p provisional) final-digits (digits (shifted p)))
                                (if (map? packed)
                                  (str (fill (:before packed))
                                       (json/write-str (assign-change (:change packed) clock new-id-set prior-rows))
                                       (fill (:after packed)))
                                  (fill packed))))'''
commit = once(commit, '''(str text (if (= p provisional) final-digits (digits (shifted p)))
                              (apply str (interpose (Double/toString (double clock)) packed)))''', packed)
identity = between(fixed, "           (conflict []", "           head-v2")
commit = once(commit, between(commit, "           (conflict []", "           head-v2"), identity)
commit = once(commit, "(when-not (row-id id) (conflict))",
              """(if-let [row (row-id id)]
             (when server-clock (vswap! prior-rows assoc id (recorded-row-code (:v row))))
             (conflict))""")
commit = once(commit, "'lean-columns-code slim/row-columns-code\n",
              "'recorded-row-code (walk/postwalk-replace {'lean-columns-code slim/row-columns-code} recorded-row-code)\n")

merge = inputs["group.clj"]
if ":bulk (boolean (:bulk p))" in merge:
    choices = iter((0, 2, 2, 1, 1))
    group = conflict.sub(
        lambda m: m[i] if (i := next(choices)) else m[2].rstrip() + " :bulk (boolean (:bulk p))\n", merge
    )
else:
    choices = iter((1, 1))
    group = conflict.sub(lambda m: m[next(choices)], merge)
assert next(choices, None) is None
group = once(group, '(= "TRIPLEX_GROUP_STALE" (ex-message cause))',
             '''(contains? #{"TRIPLEX_GROUP_STALE" "TRIPLEX_OPERATION_DUPLICATE" "TRIPLEX_COMMAND_DUPLICATE"}
                                      (ex-message cause))''')

prepared = inputs["group_prepare.clj"]
prepared = once(prepared, ":triplex.group/apply-prepared-v1", ":triplex.group/apply-prepared-v2")
guard = '''       (doseq [member (get witness :members)]
         (when (d/entid db [:triplex.tx/operation-id (get member :operation)])
           (throw (ex-info "TRIPLEX_OPERATION_DUPLICATE" {})))
         (when (d/entid db [:triplex.claim/command-id (get member :command)])
           (throw (ex-info "TRIPLEX_COMMAND_DUPLICATE" {}))))
'''
prepared = once(prepared, "       (doseq [[a expected]", guard + "       (doseq [[a expected]")
prepared = once(prepared, ":witness {:function", ''':witness {:operation (:triplex.tx/operation-id (first ops))
                         :command (:triplex.claim/command-id (first claims))
                         :function''')
retirements = '''               :retirement-times (into {} (map (fn [[_ prefix text]]
                                                  [(subs prefix 5) (commit/recorded-row text)]))
                                       retirements)
'''
if ":retirement-times" in prepared:
    prepared = once(prepared, "\n                timed (set (:timed-retractions p))]", "]")
    prepared = once(prepared, between(prepared, "               :retirement-times", "               :witness"), retirements)
else:
    prepared = once(prepared, "               :witness", retirements + "               :witness")
    prepared = once(prepared, "[id operations provisional new-ids witness]", "[id operations provisional new-ids witness retirement-times]")
    prepared = once(prepared, "provisional position false {})", "provisional position false retirement-times)")
    # [DX-WFIX1] Why: INT1 can prepare timed retirements once its checked rows supply the metadata.
    # Rejected: preparing across an incompatible base definition or a packed identity history.
    prepared = once(prepared, ":triplex.scope/position-regular :triplex.scope/irregular])",
                    ":triplex.scope/position-regular :triplex.scope/irregular :triplex.scope/packed-journals])")
    prepared = once(prepared, "               ;; [DX-INT1] Why: the reference writer owns ledger conversion and timed predecessors.\n"
                    "               ;; Rejected: preparing a shape whose final journal depends on authoritative predecessor metadata.\n"
                    "               (not-any? p [:save-ledger :packed-journal :timed-retractions])",
                    "               (not-any? p [:save-ledger :packed-journal])")
    prepared = once(prepared, "(when (and (some? (:triplex.scope/key by-flag)) owner",
                    "(when (and (some? (:triplex.scope/key by-flag)) owner\n"
                    "                   (= commit/source-hash (:triplex.scope/commit-fn-hash by-flag))\n"
                    "                   (not (:triplex.scope/packed-journals by-flag))")
for name, content in (("commit.clj", commit), ("group.clj", group), ("group_prepare.clj", prepared)):
    assert not conflict.search(content), name
    (root / name).write_text(content)
