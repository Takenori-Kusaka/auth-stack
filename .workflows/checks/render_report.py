#!/usr/bin/env python3
"""Render the AUTO section of traceability/consistency-checks.md from results JSON.

usage: python -I .workflows/checks/render_report.py [--before before] [--after after]
Replaces the text between '<!-- AUTO:BEGIN -->' and '<!-- AUTO:END -->'.
"""
import argparse
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, ".workflows", "checks", "out")
DOC = os.path.join(ROOT, "traceability", "consistency-checks.md")

LABELS = {
    "1_meta_missing": "(1) メタ情報ブロック欠落（文書数）",
    "1_meta_docid_mismatch": "(1) 文書ID と §8 の不一致",
    "2_forbidden_total": "(2) 禁止表現の出現（全件）",
    "2_forbidden_review": "(2) うち自動分類で文脈不明（要目視）",
    "3_claimtag_flagged_units": "(3) 主張タグ欠落が多い段落・箇条（00_decision・ADR 本文）",
    "3_claimtag_untagged_sentences": "(3) タグのない文（表を除く、同範囲）",
    "4_undefined_id_distinct": "(4) 未定義 ID（異なり）",
    "4_undefined_id_occurrences": "(4) 未定義 ID（出現）",
    "4_subid_or_range_distinct": "(4) 枝番・範囲端・番号帯（参考）",
    "4_external_namespace_excluded": "(4) 外部名前空間として除外（判例番号・OMB 通達）",
    "4_duplicate_definitions": "(4) ID の重複定義",
    "5_footnote_undefined": "(5) 未定義脚注",
    "5_footnote_crossdoc_mention": "(5) 他文書の脚注番号への言及（除外）",
    "5_footnote_unused": "(5) 未使用脚注",
    "5_footnote_numbering_gap_files": "(5) 脚注番号に欠番がある文書",
    "5_footnote_duplicate": "(5) 重複定義",
    "6_planned_missing": "(6) §8 にあり実ファイルなし",
    "6_unregistered": "(6) 実ファイルがあり §8 に未登録",
    "7_broken_links": "(7) 相対リンク切れ（Markdown リンク）",
    "7_bare_path_unplanned": "(7) 本文中のパス表記で、実在せず §8 にもないもの",
    "7_bare_path_planned_not_created": "(7) 本文中のパス表記で、§8 にあり未作成のもの（参考）",
    "8_json_invalid": "(8) JSON 構文エラー",
    "8_openapi_errors": "(8) OpenAPI lint error",
    "8_openapi_warnings": "(8) OpenAPI lint warning",
}


def load(label):
    with open(os.path.join(OUT, f"results-{label}.json"), encoding="utf-8") as fh:
        return json.load(fh)


def md_escape(s):
    return str(s).replace("|", "\\|").replace("\n", " ")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--before", default="before")
    ap.add_argument("--after", default="after")
    a = ap.parse_args()
    b, f = load(a.before), load(a.after)
    L = []
    L.append(f"生成: render_report.py（是正前 `{b['label']}` {b['time']}、是正後 `{f['label']}` {f['time']}）。生データ: .workflows/checks/out/results-{b['label']}.json, results-{f['label']}.json, history.json。")
    L.append("")
    L.append("### A.1 検査項目別の件数（是正前／是正後）")
    L.append("")
    L.append("| 検査項目 | 是正前 | 是正後 |")
    L.append("|---|---|---|")
    for k, lab in LABELS.items():
        L.append(f"| {lab} | {b['counts'].get(k, '—')} | {f['counts'].get(k, '—')} |")
    L.append("")
    L.append("### A.2 適用した機械的是正")
    L.append("")
    L.append("| 検査 | ファイル | 内容 |")
    L.append("|---|---|---|")
    fixes = []
    for lab in ("fix",):
        p = os.path.join(OUT, f"results-{lab}.json")
        if os.path.exists(p):
            with open(p, encoding="utf-8") as fh:
                fixes += json.load(fh)["fixes"]
    mp = os.path.join(OUT, "manual-fixes.json")
    if os.path.exists(mp):
        with open(mp, encoding="utf-8") as fh:
            fixes += [dict(x, action=x["action"] + "（手作業の機械的是正）") for x in json.load(fh)]
    for x in fixes:
        L.append(f"| {x['check']} | {md_escape(x['file'])} | {md_escape(x['action'])} |")
    L.append("")
    r = f["results"]
    L.append("### A.3 是正後に残る検出（内容判断が要るもの）")
    L.append("")
    L.append("#### (2) 禁止表現の出現箇所")
    L.append("")
    L.append("| ファイル:行 | 表現 | 自動分類 | 文脈（抜粋） |")
    L.append("|---|---|---|---|")
    for x in r["forbidden"]:
        L.append(f"| {x['file']}:{x['line']} | {x['word']} | {x['class']} | `{md_escape(x['context'][:70]).replace('`', "'")}` |")
    L.append("")
    L.append("#### (4) 未定義 ID・枝番・範囲端")
    L.append("")
    L.append("| ID | 区分 | 出現 | 位置（先頭 4 件） |")
    L.append("|---|---|---|---|")
    for x in r["ids"]:
        if x["category"] == "external-namespace":
            continue
        L.append(f"| {x['id']} | {x['category']} | {x['count']} | {', '.join(x['locations'][:4])} |")
    L.append("")
    L.append("#### (4) 重複定義")
    L.append("")
    L.append(f"{len(r.get('dupdefs', []))} 件。" + "".join(f" {x['id']}（{x['file']} 行 {x['lines']}）" for x in r.get("dupdefs", [])))
    L.append("")
    L.append("#### (5) 脚注")
    L.append("")
    L.append("| ファイル | 種別 | 脚注 |")
    L.append("|---|---|---|")
    for x in r["footnotes"]:
        if x["kind"] == "mention":
            continue
        L.append(f"| {x['file']} | {x['kind']} | {md_escape(x['fn'])} |")
    L.append("")
    L.append("#### (6) §8 との差分")
    L.append("")
    L.append("| 種別 | パス | DL |")
    L.append("|---|---|---|")
    for x in r["deliverables"]:
        L.append(f"| {x['kind']} | {x['path']} | {x.get('dl', '')} |")
    L.append("")
    L.append("#### (7) 実在せず §8 にもないパス表記")
    L.append("")
    L.append("| ファイル:行 | パス |")
    L.append("|---|---|")
    for x in r["barepaths"]:
        if x["kind"] == "unplanned":
            L.append(f"| {x['file']}:{x['line']} | {x['path']} |")
    L.append("")
    L.append("#### (8) OpenAPI lint")
    L.append("")
    L.append("| ファイル | error | warning | 指摘（rule / pointer） |")
    L.append("|---|---|---|---|")
    for x in r["openapi"]:
        probs = "; ".join(f"{p['rule']} {p.get('pointer', '')}" for p in x["problems"]) or "—"
        L.append(f"| {x['file']} | {x['errors']} | {x['warnings']} | {md_escape(probs)} |")
    L.append("")
    L.append("#### (3) 主張タグ: 文書別の集計")
    L.append("")
    L.append("| 文書 | 文（表を除く） | タグなし | 表セル内の文 | うちタグなし | 要確認の段落・箇条 |")
    L.append("|---|---|---|---|---|---|")
    flagged = {}
    for x in r["claimtags"]:
        flagged[x["file"]] = flagged.get(x["file"], 0) + 1
    for k, v in f["claimtag_stats"].items():
        L.append(f"| {k} | {v['sentences']} | {v['untagged']} | {v['table_sentences']} | {v['table_untagged']} | {flagged.get(k, 0)} |")
    L.append("")
    L.append("要確認の段落・箇条の全件（行番号と先頭の文）は results-after.json の `results.claimtags` にある。")
    body = "\n".join(L)
    with open(DOC, encoding="utf-8") as fh:
        doc = fh.read()
    s, e = doc.index("<!-- AUTO:BEGIN -->"), doc.index("<!-- AUTO:END -->")
    doc = doc[: s + len("<!-- AUTO:BEGIN -->")] + "\n" + body + "\n" + doc[e:]
    with open(DOC, "w", encoding="utf-8", newline="") as fh:
        fh.write(doc)
    print("rendered", len(L), "lines")


if __name__ == "__main__":
    main()
