#!/usr/bin/env python3
"""Reference evaluator (test plan §3.1 "参照評価器（Python）"): a deliberately naive, engine-independent
implementation of the CAM semantics, used to generate expected values for differential tests
(TC-002, TC-012, TC-013, TC-021).

Semantics (authorization-model.md §8.1):
  relation      : direct tuples (subject == user, condition true) or userset tuples (T:X#r -> check(T:X, r))
  permission    : expression over  name | ts->name | a | b | a & b | a - b
  ttu ts->name  : for every tuple (obj#ts @ X) with a plain object subject, check(X, name) when X's type defines name
  conditions    : catalog only (c.not_expired: now < expires_at); missing input -> indeterminate (raises)
Only the G-stage-free R-stage semantics are modelled; tenant guardrails are evaluated by the caller.

Usage:
  python -I ref/ref_eval.py --cam model/cam.json --tuples tuples.json --queries queries.jsonl --now 2026-10-15T00:00:00Z
  queries.jsonl lines: {"user": "<sub>", "type": "files/file", "id": "<id>", "permission": "read"}
  output (stdout, JSONL): {"q": <index>, "allowed": true|false|null, "error": "..."}
"""
import argparse
import json
import re
import sys
from datetime import datetime


def parse_expr(src):
    toks = re.findall(r"->|[|&\-()]|[a-z][a-z0-9_]*", src)
    pos = [0]

    def peek():
        return toks[pos[0]] if pos[0] < len(toks) else None

    def take():
        t = toks[pos[0]]
        pos[0] += 1
        return t

    def factor():
        if peek() == "(":
            take()
            e = expr()
            if take() != ")":
                raise ValueError("expected )")
            return e
        name = take()
        if peek() == "->":
            take()
            return ("ttu", name, take())
        return ("ref", name)

    def term():
        left = factor()
        while peek() in ("&", "-"):
            op = take()
            right = factor()
            left = ("and", left, right) if op == "&" else ("but", left, right)
        return left

    def expr():
        left = term()
        while peek() == "|":
            take()
            left = ("or", left, term())
        return left

    e = expr()
    if pos[0] != len(toks):
        raise ValueError("trailing tokens in " + src)
    return e


class Indeterminate(Exception):
    pass


def ts(v):
    return datetime.fromisoformat(v.replace("Z", "+00:00"))


CONDITIONS = {
    "c.not_expired": lambda tctx, now: now < ts(tctx["expires_at"]) if tctx and "expires_at" in tctx else (_ for _ in ()).throw(Indeterminate("expires_at missing")),
}


class Model:
    def __init__(self, cam, tuples):
        self.rels, self.perms = {}, {}
        for t in cam["types"]:
            self.rels[t["name"]] = {r["name"] for r in t.get("relations", [])}
            self.perms[t["name"]] = {p["name"]: parse_expr(p["expression"]) for p in t.get("permissions", [])}
        self.by_obj_rel = {}
        for tu in tuples:
            k = (tu["resource"]["type"], tu["resource"]["id"], tu["relation"])
            self.by_obj_rel.setdefault(k, []).append(tu)

    def defines(self, typ, name):
        return name in self.rels.get(typ, set()) or name in self.perms.get(typ, {})

    def check(self, typ, oid, name, user, now, visiting=None):
        visiting = visiting if visiting is not None else set()
        key = (typ, oid, name)
        if key in visiting:
            return False  # cycle: no new path
        visiting = visiting | {key}
        if name in self.rels.get(typ, set()):
            for tu in self.by_obj_rel.get(key, []):
                cond = tu.get("condition")
                if cond and not CONDITIONS[cond["name"]](cond.get("context"), now):
                    continue
                s = tu["subject"]
                if s.get("relation"):
                    if self.check(s["type"], s["id"], s["relation"], user, now, visiting):
                        return True
                elif s["type"] == "core/user" and s["id"] == user:
                    return True
            return False
        expr = self.perms.get(typ, {}).get(name)
        if expr is None:
            raise Indeterminate(f"unknown {typ}#{name}")
        return self.eval(expr, typ, oid, user, now, visiting)

    def eval(self, e, typ, oid, user, now, visiting):
        op = e[0]
        if op == "ref":
            return self.check(typ, oid, e[1], user, now, visiting)
        if op == "ttu":
            for tu in self.by_obj_rel.get((typ, oid, e[1]), []):
                s = tu["subject"]
                if s.get("relation"):
                    continue
                cond = tu.get("condition")
                if cond and not CONDITIONS[cond["name"]](cond.get("context"), now):
                    continue
                if self.defines(s["type"], e[2]) and self.check(s["type"], s["id"], e[2], user, now, visiting):
                    return True
            return False
        if op == "or":
            return self.eval(e[1], typ, oid, user, now, visiting) or self.eval(e[2], typ, oid, user, now, visiting)
        if op == "and":
            return self.eval(e[1], typ, oid, user, now, visiting) and self.eval(e[2], typ, oid, user, now, visiting)
        if op == "but":
            return self.eval(e[1], typ, oid, user, now, visiting) and not self.eval(e[2], typ, oid, user, now, visiting)
        raise ValueError(op)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cam", required=True)
    ap.add_argument("--tuples", required=True, help="JSON array of tuples, or a dataset.json with a 'tuples' key")
    ap.add_argument("--queries", required=True)
    ap.add_argument("--now", default=None)
    a = ap.parse_args()
    with open(a.cam, encoding="utf-8") as f:
        cam = json.load(f)
    with open(a.tuples, encoding="utf-8") as f:
        tdata = json.load(f)
    tuples = tdata["tuples"] if isinstance(tdata, dict) else tdata
    now = ts(a.now) if a.now else datetime.now().astimezone()
    m = Model(cam, tuples)
    out = sys.stdout
    with open(a.queries, encoding="utf-8") as f:
        for i, line in enumerate(f):
            if not line.strip():
                continue
            q = json.loads(line)
            try:
                r = m.check(q["type"], q["id"], q["permission"], q["user"], now)
                out.write(json.dumps({"q": i, "allowed": r}) + "\n")
            except (Indeterminate, KeyError) as e:
                out.write(json.dumps({"q": i, "allowed": None, "error": str(e)}) + "\n")


if __name__ == "__main__":
    main()
