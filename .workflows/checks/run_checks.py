#!/usr/bin/env python3
"""TRC-12 (DL-111) automated consistency checks.

Usage (from anywhere; run with -I for isolation):
    python -I .workflows/checks/run_checks.py [--root E:/Github/auth-stack] [--fix] [--label before|after|<free>]
                                              [--no-openapi] [--write-report]

Checks
  1  meta        : CONVENTIONS §1 metadata block (文書ID/対応要求/依存文書) and 文書ID vs deliverables §8
  2  forbidden   : CONVENTIONS §5 forbidden expressions, with context classification
  3  claimtags   : paragraphs lacking claim tags in 00_decision and 05_adr (main body)
  4  ids         : references to R/G/A/S/T/ATK/ADR/DL/SLI/K/RB/TC/P/C that are not defined
  5  footnotes   : undefined / unused / duplicate footnotes
  6  deliverables: deliverables.md §8 file list vs actual files
  7  links       : broken relative markdown links (and bare repo-path mentions, report-only)
  8  json/openapi: python json parse + redocly lint

--fix applies only mechanical fixes:
  - relative links that resolve from the repo root but not from the file's directory -> rewrite to file-relative path
  - missing metadata block -> insert a block derived from deliverables §8 (状態 draft, 対応要求 from the DL row)
  Everything else is reported for human judgment.

Outputs: .workflows/checks/out/results-<label>.json, .workflows/checks/out/history.json (count trend),
         and (with --write-report) the AUTO section of traceability/consistency-checks.md.
"""
import argparse
import datetime as _dt
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.parse
from collections import defaultdict, OrderedDict

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

EXCLUDE_DIRS = {".git", "node_modules", "12_poc/tools", "12_poc/code/node_modules", "12_poc/code/.run"}
# Pre-existing baseline files (not authored in this program): excluded from meta/forbidden/claim/id checks.
BASELINE = {
    "CONVENTIONS.md",
    "マルチテナントSaaS認証・認可基盤の比較調査と設計指針.md",
    "20年運用を前提とした認証・認可基盤提案のCTO CISOレビュー.md",
    "traceability/seed/seed-01-ciso-assurance.md",
    "traceability/seed/seed-02-cto-technical.md",
    "traceability/seed/seed-03-redteam-decision.md",
}
SELF = "traceability/consistency-checks.md"
# research_notes/ are raw deep-research worker notes (RS-18 inputs); reports/ is the RS-18 report.
RAW_NOTES_PREFIX = ("research_notes/",)

FORBIDDEN = ["完全無欠", "万全", "完璧", "絶対に安全", "あらゆる攻撃を防ぐ", "非常に高いセキュリティ",
             "Zanzibar相当", "業界最高水準", "問題ない", "十分安全"]
NEG_PAT = re.compile(r"(ない|せず|しない|主張しない|使わない|書かない|禁止|避け|削除|撤回|不可|否定|言えない|できない|でない|ではない|置換|言い換え|表現を|禁止表現|NG)")

ID_SPECS = OrderedDict([
    # prefix: (regex for a reference, definition files)
    ("R", (r"R-\d{3}(?:\.\d+)?", ["traceability/R-requirements.md"])),
    ("G", (r"G-\d{3}", ["traceability/G-goal-criteria.md"])),
    ("A", (r"A-\d{3}", ["01_governance/assumptions-register.md"])),
    ("S", (r"S-\d{2}", ["01_governance/loss-scenarios.md"])),
    ("T", (r"T-\d{3}", ["03_threat-model/threat-catalog.md"])),
    ("ATK", (r"ATK-\d{2}", ["03_threat-model/attacker-model.md"])),
    ("ADR", (r"ADR-\d{3}", ["05_adr/README.md"])),
    ("DL", (r"DL-\d{2,3}", ["traceability/deliverables.md"])),
    ("SLI", (r"SLI-\d{3}", ["07_slo/numeric-contracts.md"])),
    ("K", (r"K-\d{2}", ["01_governance/kri.md"])),
    ("RB", (r"RB-\d{2}", ["08_operations/compromise-runbooks.md"])),
    ("TC", (r"TC-\d{3}", ["12_poc/preregistered-test-plan.md"])),
    ("P", (r"P-\d{2}", ["10_integration/integration-patterns.md"])),
    ("C", (r"C-\d{3}", ["06_controls/control-mapping-ledger.md"])),
])
TAG_RE = re.compile(r"\[(?:N|V|I|M|D)\]|\[A-\d{3}(?:\s*[,、]\s*A-\d{3})*\]")


def rel(root, p):
    return os.path.relpath(p, root).replace("\\", "/")


def walk(root):
    out = []
    for dp, dns, fns in os.walk(root):
        rdp = rel(root, dp)
        if rdp == ".":
            rdp = ""
        dns[:] = [d for d in dns if d not in (".git", "node_modules") and (rdp + "/" + d).lstrip("/") not in EXCLUDE_DIRS]
        for f in fns:
            out.append((rdp + "/" + f).lstrip("/"))
    return sorted(out)


def read(root, p):
    with open(os.path.join(root, p), encoding="utf-8") as fh:
        return fh.read()


def write(root, p, s):
    with open(os.path.join(root, p), "w", encoding="utf-8", newline="") as fh:
        fh.write(s)


def strip_code(text):
    """Return list of (lineno, line) with fenced code blocks blanked and inline code removed."""
    lines = text.split("\n")
    out = []
    fence = None
    for i, ln in enumerate(lines, 1):
        m = re.match(r"^\s*(```+|~~~+)", ln)
        if m:
            tok = m.group(1)[:3]
            if fence is None:
                fence = tok
            elif tok == fence:
                fence = None
            out.append((i, ""))
            continue
        if fence:
            out.append((i, ""))
            continue
        out.append((i, re.sub(r"`[^`]*`", "", ln)))
    return out


# ---------------------------------------------------------------- deliverables §8
def parse_section8(root):
    text = read(root, "traceability/deliverables.md")
    sec = text.split("## 8. ディレクトリごとのファイル一覧", 1)[1].split("## 参考文献", 1)[0]
    rows = []
    for ln in sec.split("\n"):
        m = re.match(r"^\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*$", ln)
        if not m or m.group(1) in ("パス",) or set(m.group(1)) <= set("-: "):
            continue
        rows.append({"path": m.group(1), "docid": m.group(2), "dl": m.group(3), "note": m.group(4)})
    dlrows = {}
    for ln in text.split("\n"):
        m = re.match(r"^\|\s*(DL-\d+)\s*\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|", ln)
        if m:
            dlrows[m.group(1)] = {"name": m.group(2).strip(), "path": m.group(3).strip(), "req": m.group(5).strip()}
    return rows, dlrows


# ---------------------------------------------------------------- 1 meta
def check_meta(root, mdfiles, sec8, fix, log):
    expected = {r["path"]: r for r in sec8}
    findings = []
    for p in mdfiles:
        if p in BASELINE or p.startswith(RAW_NOTES_PREFIX):
            continue
        text = read(root, p)
        head = "\n".join(text.split("\n")[:15])
        has_id = re.search(r"^>\s*文書ID[:：]", head, re.M)
        has_req = re.search(r"^>\s*対応要求[:：]", head, re.M)
        has_dep = re.search(r"^>\s*依存文書[:：]", head, re.M)
        missing = [k for k, v in (("文書ID", has_id), ("対応要求", has_req), ("依存文書", has_dep)) if not v]
        if missing:
            f = {"file": p, "kind": "missing", "missing": missing}
            if fix and p in expected and len(missing) == 3:
                f["fixed"] = insert_meta(root, p, text, expected[p], log)
            elif fix and missing == ["対応要求"]:
                f["fixed"] = insert_req_line(root, p, text, log)
            findings.append(f)
            continue
        m = re.search(r"^>\s*文書ID[:：]\s*([^/\s（(]+)", head, re.M)
        docid = m.group(1).strip() if m else ""
        if p in expected and expected[p]["docid"] not in ("", "—") and docid != expected[p]["docid"]:
            findings.append({"file": p, "kind": "docid-mismatch", "actual": docid, "expected": expected[p]["docid"]})
    return findings


def insert_req_line(root, p, text, log):
    """Only for research/verification/RS-xx-verification.md: copy 対応要求 from the verified note."""
    m = re.match(r"research/verification/(RS-\d{2})-verification\.md$", p)
    if not m:
        return False
    notes = [f for f in os.listdir(os.path.join(root, "research")) if f.startswith(m.group(1) + "-")]
    if not notes:
        return False
    nm = re.search(r"^>\s*対応要求[:：]\s*(.+)$", read(root, "research/" + notes[0]), re.M)
    if not nm:
        return False
    line = f"> 対応要求: {m.group(1)} と同じ（{nm.group(1).strip()}）"
    new = re.sub(r"(^>\s*文書ID[:：].*$)", lambda mm: mm.group(1) + "\n" + line, text, count=1, flags=re.M)
    if new == text:
        return False
    write(root, p, new)
    log["fixes"].append({"check": "meta", "file": p, "action": "inserted 対応要求 line copied from " + notes[0]})
    return True


def insert_meta(root, p, text, row, log):
    dlrows = log["_dlrows"]
    req = ""
    for dl in re.findall(r"DL-\d+", row.get("dl", "")):
        if dl in dlrows:
            req = ", ".join(re.findall(r"R-\d{3}(?:〜R-\d{3})?", dlrows[dl]["req"]))
            break
    today = _dt.date.today().isoformat()
    block = (f"> 文書ID: {row['docid']} / 版: 0.1 / 状態: draft / 最終更新: {today}\n"
             f"> 対応要求: {req or 'TBD（deliverables.md の DL 行から未取得）'}（deliverables.md {row.get('dl','')} 行から自動補完）\n"
             f"> 依存文書: CONVENTIONS.md, traceability/deliverables.md\n")
    lines = text.split("\n")
    if lines and lines[0].startswith("# "):
        new = lines[0] + "\n\n" + block + "\n" + "\n".join(lines[1:]).lstrip("\n")
    else:
        new = block + "\n" + text
    write(root, p, new)
    log["fixes"].append({"check": "meta", "file": p, "action": "inserted metadata block"})
    return True


# ---------------------------------------------------------------- 2 forbidden
def check_forbidden(root, mdfiles):
    findings = []
    for p in mdfiles:
        if p in BASELINE or p == SELF or p.startswith(RAW_NOTES_PREFIX):
            continue
        for i, ln in strip_code(read(root, p)):
            norm = ln.replace(" ", "").replace("\u3000", "")
            for w in FORBIDDEN:
                for m in re.finditer(re.escape(w), norm):
                    ctx = norm[max(0, m.start() - 40): m.end() + 40]
                    quoted = ln.lstrip().startswith(">") and not re.match(r"^>\s*(文書ID|対応要求|依存文書)", ln.lstrip()) or bool(re.search(r"[「『\"“][^」』\"”]{0,30}" + re.escape(w), norm)) or "CONVENTIONS§5" in norm or "禁止表現" in norm
                    neg = bool(NEG_PAT.search(norm[m.end(): m.end() + 30]))
                    cls = "quote/negation(auto)" if (quoted or neg) else "review"
                    findings.append({"file": p, "line": i, "word": w, "class": cls, "context": ctx})
    return findings


# ---------------------------------------------------------------- 3 claim tags
def check_claimtags(root, mdfiles):
    findings = []
    stats = {}
    targets = [p for p in mdfiles if (p.startswith("00_decision/") or re.match(r"05_adr/ADR-\d{3}", p))]
    for p in targets:
        lines = strip_code(read(root, p))
        body_end = len(lines)
        for i, ln in lines:
            if re.match(r"^##\s+(参考文献|対応表|レビュー記録|改訂履歴)", ln):
                body_end = i
                break
        units = []  # (start_line, kind, text)
        para, pstart = [], None
        for i, ln in lines:
            if i >= body_end:
                break
            s = ln.strip()
            is_meta = s.startswith(">")
            if not s or s.startswith("#") or is_meta or s.startswith("---") or re.match(r"^\[\^[^\]]+\]:", s):
                if para:
                    units.append((pstart, "para", " ".join(para)))
                    para = []
                continue
            if s.startswith("|"):
                if para:
                    units.append((pstart, "para", " ".join(para)))
                    para = []
                if set(s) <= set("|-: "):
                    continue
                units.append((i, "table", s))
                continue
            if re.match(r"^([-*+]|\d+[.)])\s+", s):
                if para:
                    units.append((pstart, "para", " ".join(para)))
                    para = []
                units.append((i, "list", s))
                continue
            if not para:
                pstart = i
            para.append(s)
        if para:
            units.append((pstart, "para", " ".join(para)))
        tot = untagged = 0
        tbl_tot = tbl_un = 0
        for start, kind, t in units:
            sents = split_sentences(t)
            if not sents:
                continue
            un = [x for x in sents if not TAG_RE.search(x)]
            if kind == "table":
                tbl_tot += len(sents)
                tbl_un += len(un)
                continue
            tot += len(sents)
            untagged += len(un)
            # flag paragraphs/lists where most sentences lack tags
            if len(un) >= 2 and len(un) / len(sents) >= 0.5 or (len(sents) == 1 and un and len(un[0]) > 60):
                findings.append({"file": p, "line": start, "kind": kind, "sentences": len(sents), "untagged": len(un),
                                 "sample": un[0][:80]})
        stats[p] = {"sentences": tot, "untagged": untagged, "table_sentences": tbl_tot, "table_untagged": tbl_un}
    return findings, stats


def split_sentences(t):
    t = re.sub(r"\*\*", "", t)
    t = re.sub(r"^([-*+]|\d+[.)])\s+", "", t)
    if t.startswith("|"):
        t = " ".join(c.strip() for c in t.strip("|").split("|"))
    parts = re.split(r"(?<=。)", t)
    out = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        # tag right after 。 belongs to previous sentence
        m = re.match(r"^((?:\s*(?:\[(?:N|V|I|M|D)\]|\[A-\d{3}[^\]]*\]|\[\^[^\]]+\]))+)(.*)$", part)
        if m and out:
            out[-1] += m.group(1)
            part = m.group(2).strip()
            if not part:
                continue
        out.append(part)
    # ignore fragments without predicate (short labels / table headers)
    idrx = r"(?:[A-Z]{1,4}-\d{1,4}(?:\.\d+)?(?:#\d+)?|#\d+|§[\d.]+|\[\^[^\]]+\])"
    return [s for s in out if len(re.sub(r"[\s|*、,，（）()〜:：。/]", "", re.sub(idrx, "", s))) >= 15 and re.search(r"[。]|る|た|い|す|だ$", s)]


# ---------------------------------------------------------------- 4 ids
def collect_defs(root, files):
    defs = {}
    for prefix, (pat, deffiles) in ID_SPECS.items():
        s = set()
        rx = re.compile(r"(?<![A-Za-z0-9-])(" + pat + r")(?![0-9])")
        for df in deffiles:
            if not os.path.exists(os.path.join(root, df)):
                continue
            for i, ln in strip_code(read(root, df)):
                st = ln.strip()
                if st.startswith("|"):
                    first = st.strip("|").split("|")[0]
                    first = first.replace("*", "").strip()
                    if "〜" in first or "~" in first:
                        continue
                    m = rx.match(first)
                    if m:
                        s.add(m.group(1))
                elif st.startswith("#"):
                    h = re.sub(r"^#+\s*", "", st).replace("*", "")
                    m = rx.match(h)
                    if m:
                        s.add(m.group(1))
                    for m in re.finditer(r"[（(](" + pat + r")[）)]", h):
                        s.add(m.group(1))
        if prefix == "ADR":
            for f in files:
                m = re.match(r"05_adr/(ADR-\d{3})-", f)
                if m:
                    s.add(m.group(1))
        defs[prefix] = s
    return defs


def check_dup_defs(root):
    """Duplicate definitions: an ID that starts more than one heading in its definition file,
    or a DL-ID that has more than one row in the deliverables catalogue tables (§3/§4, 8 columns)."""
    out = []
    for prefix, (pat, deffiles) in ID_SPECS.items():
        rx = re.compile(r"^(" + pat + r")(?![0-9])")
        for df in deffiles:
            if not os.path.exists(os.path.join(root, df)):
                continue
            seen = defaultdict(list)
            for i, ln in strip_code(read(root, df)):
                st = ln.strip()
                if st.startswith("#"):
                    m = rx.match(re.sub(r"^#+\s*", "", st).replace("*", ""))
                    if m:
                        seen[m.group(1)].append(i)
                elif prefix == "DL" and st.startswith("|") and st.count("|") >= 9:
                    m = rx.match(st.strip("|").split("|")[0].strip())
                    if m:
                        seen[m.group(1)].append(i)
            for k, v in seen.items():
                if len(v) > 1:
                    out.append({"prefix": prefix, "id": k, "file": df, "lines": v})
    return out


def check_ids(root, mdfiles, files):
    defs = collect_defs(root, files)
    findings = defaultdict(lambda: defaultdict(list))
    for p in mdfiles:
        if p in BASELINE or p == SELF or p.startswith(RAW_NOTES_PREFIX):
            continue
        for i, ln in strip_code(read(root, p)):
            for prefix, (pat, _) in ID_SPECS.items():
                rx = re.compile(r"(?<![A-Za-z0-9\-/_.])(" + pat + r")(?![0-9A-Za-z])")
                for m in rx.finditer(ln):
                    ref = m.group(1)
                    if ref in defs[prefix]:
                        continue
                    after = ln[m.end(): m.end() + 8].lstrip()
                    before = ln[max(0, m.start() - 30): m.start()]
                    if re.match(r"^/\d", after) or re.search(r"(Circular|OMB|A-11[・,、 ])\s*(A-\d+[・,、 ]*)*$", before):
                        cat = "external-namespace"   # court case no. (C-413/23, T-553/23) or OMB Circular A-123
                    elif before.endswith("〜") or after.startswith("以降") or after.startswith("〜") and re.match(r"〜\s*[|（(]", after):
                        cat = "range-or-band"        # range end / numbering band, not a single-item reference
                    elif re.match(r"^-(\d|x|xx)", after):
                        cat = "sub-id"               # provisional sub-numbering such as TC-057-01
                    else:
                        cat = "undefined"
                    findings[(prefix, cat)][ref].append(f"{p}:{i}")
    out = []
    for (prefix, cat) in sorted(findings, key=lambda k: (list(ID_SPECS).index(k[0]), k[1])):
        for ref, locs in sorted(findings[(prefix, cat)].items()):
            out.append({"prefix": prefix, "id": ref, "category": cat, "count": len(locs), "locations": locs[:8]})
    return out, {k: len(v) for k, v in defs.items()}


# ---------------------------------------------------------------- 5 footnotes
def check_footnotes(root, mdfiles):
    out = []
    for p in mdfiles:
        if p in BASELINE:
            continue
        lines = strip_code(read(root, p))
        defs = defaultdict(list)
        refs = defaultdict(list)
        mentions = defaultdict(list)
        for i, ln in lines:
            m = re.match(r"^\s*\[\^([^\]]+)\]:", ln)
            in_def = bool(m)
            if m:
                defs[m.group(1)].append(i)
                body = ln[m.end():]
            else:
                body = ln
            last_end, last_mention = -99, False
            for r in re.finditer(r"\[\^([^\]\s]+)\](?!:)", body):
                before = body[max(0, r.start() - 14): r.start()]
                gap = body[last_end: r.start()] if last_end >= 0 else None
                # cross-document mention: "RS-15 の脚注 [^72]", "ADR-022 [^54]", "脚注 [^8]", "[^65]〜[^78]"
                is_mention = (in_def
                              or re.search(r"脚注(番号)?\s*$", before)
                              or re.search(r"(?<![A-Za-z])[A-Z]{2,4}-\d{2,4}(-[A-Z]+)?\s+$", before)
                              or not re.fullmatch(r"[\w-]+", r.group(1)) or r.group(1) in ("n", "x", "xx")
                              or (re.search(r"（\s*$", before) and body[r.end(): r.end() + 3].startswith("〜[^"))
                              or (last_mention and gap is not None and re.fullmatch(r"\s*[〜・、,]?\s*", gap)))
                last_end, last_mention = r.end(), bool(is_mention)
                if is_mention:
                    mentions[r.group(1)].append(i)
                    continue
                refs[r.group(1)].append(i)
        mention = (not defs) or p.startswith("research/verification/")
        for k in refs:
            if k not in defs:
                out.append({"file": p, "kind": "mention" if mention else "undefined", "fn": k, "lines": refs[k][:5]})
        nums = sorted(int(k) for k in defs if k.isdigit())
        if nums and len(nums) == len(defs):
            gaps = sorted(set(range(1, nums[-1] + 1)) - set(nums))
            if gaps:
                out.append({"file": p, "kind": "numbering-gap", "fn": ",".join(map(str, gaps)), "lines": []})
        for k in defs:
            if k not in refs:
                out.append({"file": p, "kind": "unused", "fn": k, "lines": defs[k]})
            if len(defs[k]) > 1:
                out.append({"file": p, "kind": "duplicate-def", "fn": k, "lines": defs[k]})
    return out


# ---------------------------------------------------------------- 6 deliverables diff
def check_deliverables(root, files, sec8):
    planned = [r["path"] for r in sec8]
    pset = set(planned)
    out = []
    for r in sec8:
        pth = r["path"]
        if "RS-xx" in pth:
            continue
        if pth.endswith("/"):
            if not os.path.isdir(os.path.join(root, pth)):
                out.append({"kind": "planned-missing", "path": pth, "dl": r["dl"]})
            continue
        if not os.path.exists(os.path.join(root, pth)):
            out.append({"kind": "planned-missing", "path": pth, "dl": r["dl"]})
    for f in files:
        if not re.search(r"\.(md|ya?ml|json)$", f):
            continue
        if f.startswith((".workflows/", "12_poc/code/", "12_poc/data/")) or f.startswith("."):
            continue
        if re.match(r"research/verification/RS-\d{2}-verification\.md$", f):
            continue
        if f not in pset:
            out.append({"kind": "unregistered", "path": f})
    return out


# ---------------------------------------------------------------- 7 links
LINK_RE = re.compile(r"(?<!!)\[([^\]]*)\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
IMG_RE = re.compile(r"!\[([^\]]*)\]\(([^)\s]+)\)")
PATH_RE = re.compile(r"(?<![\w/.\-])((?:0\d_[a-z\-]+|1[0-2]_[a-z\-]+|research|traceability|reports)/[A-Za-z0-9_\-./]+\.(?:md|ya?ml|json))")


def check_links(root, mdfiles, fix, log, planned=()):
    planned = set(planned)
    out = []
    bare = []
    for p in mdfiles:
        text = read(root, p)
        base = os.path.dirname(p)
        changed = False
        new_text = text
        for i, ln in strip_code(text):
            for rx in (LINK_RE, IMG_RE):
                for m in rx.finditer(ln):
                    tgt = m.group(2)
                    if re.match(r"^(https?:|mailto:|#|data:)", tgt):
                        continue
                    path = urllib.parse.unquote(tgt.split("#", 1)[0])
                    if not path:
                        continue
                    cand = os.path.normpath(os.path.join(root, base, path))
                    if os.path.exists(cand):
                        continue
                    rootcand = os.path.normpath(os.path.join(root, path))
                    f = {"file": p, "line": i, "target": tgt}
                    if os.path.exists(rootcand):
                        newrel = os.path.relpath(rootcand, os.path.join(root, base)).replace("\\", "/")
                        anchor = ("#" + tgt.split("#", 1)[1]) if "#" in tgt else ""
                        f["suggest"] = newrel + anchor
                        if fix:
                            old = m.group(0)
                            rep = old.replace("(" + tgt, "(" + newrel + anchor, 1)
                            if old in new_text:
                                new_text = new_text.replace(old, rep)
                                changed = True
                                f["fixed"] = True
                    out.append(f)
        if changed:
            write(root, p, new_text)
            log["fixes"].append({"check": "links", "file": p, "action": "rewrote root-relative links"})
        if p in BASELINE or p == SELF or p.startswith(RAW_NOTES_PREFIX):
            continue
        for i, ln in strip_code(text):
            for m in PATH_RE.finditer(ln):
                pth = m.group(1).rstrip(".")
                if not os.path.exists(os.path.join(root, pth)):
                    bare.append({"file": p, "line": i, "path": pth,
                                 "kind": "planned-not-yet-created" if pth in planned or "RS-xx" in pth else "unplanned"})
    return out, bare


# ---------------------------------------------------------------- 8 json / openapi
def check_json(root, files):
    out = []
    for f in files:
        if not f.endswith(".json") or f.startswith("12_poc/code/package-lock"):
            continue
        if not f.startswith(("11_contracts/", "12_poc/code/model/", "12_poc/code/package.json")):
            continue
        r = subprocess.run([sys.executable, "-I", "-m", "json.tool", os.path.join(root, f)],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
        out.append({"file": f, "ok": r.returncode == 0, "error": (r.stderr or "").strip()[:300]})
    return out


def check_openapi(root, files):
    out = []
    npx = shutil.which("npx") or shutil.which("npx.cmd")
    if not npx:
        return [{"file": "*", "ok": False, "error": "npx not found"}]
    for f in files:
        if not f.endswith(".openapi.yaml"):
            continue
        r = subprocess.run([npx, "--yes", "@redocly/cli@latest", "lint", "--format=json", os.path.join(root, f)],
                           capture_output=True, text=True, encoding="utf-8", errors="replace", cwd=root)
        errs = warns = 0
        problems = []
        try:
            js = json.loads(r.stdout[r.stdout.index("{"):])
            for pr in js.get("problems", []):
                sev = pr.get("severity")
                if sev == "error":
                    errs += 1
                else:
                    warns += 1
                loc = ""
                try:
                    loc = pr["location"][0]["pointer"]
                except Exception:
                    pass
                problems.append({"severity": sev, "rule": pr.get("ruleId"), "message": pr.get("message", "")[:200], "pointer": loc})
        except Exception:
            problems.append({"severity": "error", "rule": "parse", "message": (r.stdout + r.stderr)[-500:]})
            errs = 1
        out.append({"file": f, "errors": errs, "warnings": warns, "problems": problems})
    return out


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
    ap.add_argument("--fix", action="store_true")
    ap.add_argument("--label", default=_dt.datetime.now().strftime("%Y%m%dT%H%M%S"))
    ap.add_argument("--no-openapi", action="store_true")
    ap.add_argument("--outdir", default=None, help="where results/history go (default <root>/.workflows/checks/out)")
    args = ap.parse_args()
    root = os.path.abspath(args.root)
    files = walk(root)
    mdfiles = [f for f in files if f.endswith(".md") and not f.startswith((".workflows/", "12_poc/code/"))]
    sec8, dlrows = parse_section8(root)
    log = {"fixes": [], "_dlrows": dlrows}

    res = OrderedDict()
    res["meta"] = check_meta(root, mdfiles, sec8, args.fix, log)
    res["forbidden"] = check_forbidden(root, mdfiles)
    res["claimtags"], claimstats = check_claimtags(root, mdfiles)
    res["ids"], defcounts = check_ids(root, mdfiles, files)
    res["dupdefs"] = check_dup_defs(root)
    res["footnotes"] = check_footnotes(root, mdfiles)
    res["deliverables"] = check_deliverables(root, files, sec8)
    res["links"], bare = check_links(root, mdfiles, args.fix, log, [r["path"] for r in sec8])
    res["barepaths"] = bare
    res["json"] = check_json(root, files)
    res["openapi"] = [] if args.no_openapi else check_openapi(root, files)

    counts = OrderedDict()
    counts["1_meta_missing"] = sum(1 for x in res["meta"] if x["kind"] == "missing" and not x.get("fixed"))
    counts["1_meta_docid_mismatch"] = sum(1 for x in res["meta"] if x["kind"] == "docid-mismatch")
    counts["2_forbidden_total"] = len(res["forbidden"])
    counts["2_forbidden_review"] = sum(1 for x in res["forbidden"] if x["class"] == "review")
    counts["3_claimtag_flagged_units"] = len(res["claimtags"])
    counts["3_claimtag_untagged_sentences"] = sum(v["untagged"] for v in claimstats.values())
    counts["4_undefined_id_distinct"] = sum(1 for x in res["ids"] if x["category"] == "undefined")
    counts["4_undefined_id_occurrences"] = sum(x["count"] for x in res["ids"] if x["category"] == "undefined")
    counts["4_subid_or_range_distinct"] = sum(1 for x in res["ids"] if x["category"] in ("sub-id", "range-or-band"))
    counts["4_external_namespace_excluded"] = sum(1 for x in res["ids"] if x["category"] == "external-namespace")
    counts["4_duplicate_definitions"] = len(res["dupdefs"])
    counts["5_footnote_undefined"] = sum(1 for x in res["footnotes"] if x["kind"] == "undefined")
    counts["5_footnote_crossdoc_mention"] = sum(1 for x in res["footnotes"] if x["kind"] == "mention")
    counts["5_footnote_unused"] = sum(1 for x in res["footnotes"] if x["kind"] == "unused")
    counts["5_footnote_numbering_gap_files"] = sum(1 for x in res["footnotes"] if x["kind"] == "numbering-gap")
    counts["5_footnote_duplicate"] = sum(1 for x in res["footnotes"] if x["kind"] == "duplicate-def")
    counts["6_planned_missing"] = sum(1 for x in res["deliverables"] if x["kind"] == "planned-missing")
    counts["6_unregistered"] = sum(1 for x in res["deliverables"] if x["kind"] == "unregistered")
    counts["7_broken_links"] = sum(1 for x in res["links"] if not x.get("fixed"))
    counts["7_bare_path_unplanned"] = sum(1 for x in bare if x["kind"] == "unplanned")
    counts["7_bare_path_planned_not_created"] = sum(1 for x in bare if x["kind"] != "unplanned")
    counts["8_json_invalid"] = sum(1 for x in res["json"] if not x["ok"])
    counts["8_openapi_errors"] = sum(x.get("errors", 0) for x in res["openapi"])
    counts["8_openapi_warnings"] = sum(x.get("warnings", 0) for x in res["openapi"])

    outdir = os.path.abspath(args.outdir) if args.outdir else os.path.join(root, ".workflows", "checks", "out")
    os.makedirs(outdir, exist_ok=True)
    payload = {"label": args.label, "time": _dt.datetime.now().isoformat(timespec="seconds"), "fix": args.fix,
               "counts": counts, "files_scanned_md": len(mdfiles), "id_definitions": defcounts,
               "claimtag_stats": claimstats, "fixes": log["fixes"], "results": res}
    with open(os.path.join(outdir, f"results-{args.label}.json"), "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=1)
    hp = os.path.join(outdir, "history.json")
    hist = []
    if os.path.exists(hp):
        with open(hp, encoding="utf-8") as fh:
            hist = json.load(fh)
    hist.append({"label": args.label, "time": payload["time"], "fix": args.fix, "counts": counts})
    with open(hp, "w", encoding="utf-8") as fh:
        json.dump(hist, fh, ensure_ascii=False, indent=1)
    print(json.dumps({"label": args.label, "counts": counts, "fixes": len(log["fixes"])}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
