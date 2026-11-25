#!/usr/bin/env python3
"""[DX-ERA3] The review's proposed fix for finding F1 (and F1b), as a patch applied to a COPY of the gateway source
(era3/run.sh with ERA3_PATCH=1 applies it to the container's private copy; the branch's removal code is unchanged).

F1: on a moved database a ticket that names no account is checked against the published sequence while a removal is
pending, and nothing at Datomic's serial point compares it with a removal that already committed. Fix: such a ticket
carries today's exact fence on the global removal sequence (`cas removal-seq offered offered`).
F1b: any ticketed write is accepted while a removal's intent is pending. Fix: a ticketed write is refused (503, as
today) while the pending removal touches one of its accounts, the unscoped account, or when it names no account.
Usage: fix-proposal.py GATEWAY_SRC_DIR
"""
import sys, pathlib

src = pathlib.Path(sys.argv[1]) / "triplex" / "gateway"

storage = src / "storage.clj"
s = storage.read_text()
old = """                   [[:db/cas scope :triplex.scope/erasure-seq removal-scope/sentinel removal-scope/sentinel]
                    (removal-scope/fence-op privacy/*cut* rows (removal-scope/ticket-accounts input))]"""
new = """                   (cond-> [[:db/cas scope :triplex.scope/erasure-seq removal-scope/sentinel removal-scope/sentinel]
                            (removal-scope/fence-op privacy/*cut* rows (removal-scope/ticket-accounts input))]
                     ;; [DX-ERA3 proposal] A ticket naming no account keeps today's exact serial fence, on the global
                     ;; removal sequence (the database-wide one holds the sentinel on a moved database).
                     (if (contains? input "erasureSeq") (not (contains? input "erasureAccounts")) false)
                     (conj [:db/cas scope :triplex.scope/removal-seq (get input "erasureSeq") (get input "erasureSeq")]))"""
assert old in s, "storage.clj fence not found"
storage.write_text(s.replace(old, new))

main = src / "main.clj"
m = main.read_text()
old = """                    (when-not (:per-account next) (trace/span "privacy/verify-write" "gateway" (privacy/verify-data! next current)))"""
new = """                    (when-not (:per-account next) (trace/span "privacy/verify-write" "gateway" (privacy/verify-data! next current)))
                    ;; [DX-ERA3 proposal] A ticketed write waits (503, as today) while the pending removal can touch what
                    ;; it read: always for a ticket naming no account, else when the removal's accounts meet its own.
                    (when (and (:per-account next) (:pending-seq next) (contains? input "erasureSeq"))
                      (let [pending-buckets (removal-scope/entry-buckets (privacy/pending name))]
                        (when (or (nil? ticket-accounts) (contains? pending-buckets removal-scope/unscoped)
                                  (some pending-buckets ticket-accounts))
                          (privacy/unavailable!))))"""
assert old in m, "main.clj write branch not found"
main.write_text(m.replace(old, new))
print("DX-ERA3 fix proposal applied to", src)
