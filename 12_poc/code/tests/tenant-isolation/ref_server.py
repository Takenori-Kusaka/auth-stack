#!/usr/bin/env python3
"""Persistent wrapper around ref/ref_eval.py (the Python reference evaluator, test plan §3.1) for the
tenant-isolation property tests (TC-002). It keeps one mirrored tuple set and answers R-stage queries for
one or more CAM versions (the correct CAM and the deliberately wrong "全域 permit" CAM) without
re-reading files, so that expected values can be computed after every accepted relationship write.

The CAM semantics are NOT re-implemented here: Model / check() are imported unchanged from ref_eval.py.

Protocol (stdin / stdout, one JSON object per line):
  {"op":"init","cams":{"correct":"<path>","wrong":"<path>"},"tuples":"<path to JSON array or dataset.json>"}
  {"op":"write","tuples":[...]}          -> {"ok":true,"n":<count>}
  {"op":"delete","tuples":[...]}         -> {"ok":true,"n":<removed>}
  {"op":"q","model":"correct","user":"<sub>","type":"files/file","id":"<id>","permission":"read","now":"<iso>"}
                                         -> {"allowed":true|false|null,"error":"..."}
  {"op":"qs","model":...,"items":[{user,type,id,permission}],"now":...}  -> {"results":[...]}
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "ref"))
import ref_eval  # noqa: E402  (ref/ref_eval.py, unchanged)


def key(tu):
    s = tu["subject"]
    return (tu["resource"]["type"], tu["resource"]["id"], tu["relation"], s["type"], s["id"], s.get("relation") or "")


class Store:
    def __init__(self):
        self.models = {}
        self.by_obj_rel = {}
        self.keys = set()

    def init(self, cams, tuples):
        for name, path in cams.items():
            with open(path, encoding="utf-8") as f:
                cam = json.load(f)
            m = ref_eval.Model(cam, [])
            m.by_obj_rel = self.by_obj_rel  # shared mirror
            self.models[name] = m
        self.write(tuples)

    def write(self, tuples):
        n = 0
        for tu in tuples:
            k = key(tu)
            if k in self.keys:
                continue
            self.keys.add(k)
            t = {kk: vv for kk, vv in tu.items() if kk != "tid"}
            self.by_obj_rel.setdefault((t["resource"]["type"], t["resource"]["id"], t["relation"]), []).append(t)
            n += 1
        return n

    def delete(self, tuples):
        n = 0
        for tu in tuples:
            k = key(tu)
            if k not in self.keys:
                continue
            self.keys.discard(k)
            lst = self.by_obj_rel.get((k[0], k[1], k[2]), [])
            lst[:] = [t for t in lst if key(t) != k]
            n += 1
        return n

    def q(self, model, q, now):
        try:
            return {"allowed": self.models[model].check(q["type"], q["id"], q["permission"], q["user"], now)}
        except (ref_eval.Indeterminate, KeyError) as e:
            return {"allowed": None, "error": str(e)}


def main():
    st = Store()
    out = sys.stdout
    for line in sys.stdin:
        if not line.strip():
            continue
        msg = json.loads(line)
        op = msg.get("op")
        if op == "init":
            with open(msg["tuples"], encoding="utf-8") as f:
                td = json.load(f)
            st.init(msg["cams"], td["tuples"] if isinstance(td, dict) else td)
            r = {"ok": True, "tuples": len(st.keys)}
        elif op == "write":
            r = {"ok": True, "n": st.write(msg["tuples"])}
        elif op == "delete":
            r = {"ok": True, "n": st.delete(msg["tuples"])}
        elif op == "q":
            r = st.q(msg["model"], msg, ref_eval.ts(msg["now"]))
        elif op == "qs":
            now = ref_eval.ts(msg["now"])
            r = {"results": [st.q(msg["model"], it, now) for it in msg["items"]]}
        else:
            r = {"error": "unknown op"}
        out.write(json.dumps(r) + "\n")
        out.flush()


if __name__ == "__main__":
    main()
