"""Pretty-print one section of a results JSON. usage: python -I show.py <results.json> <section> [filter-kind]"""
import json, sys
sys.stdout.reconfigure(encoding="utf-8")
d = json.load(open(sys.argv[1], encoding="utf-8"))
sec = d["results"][sys.argv[2]]
flt = sys.argv[3] if len(sys.argv) > 3 else None
for x in sec:
    if flt and flt not in (x.get("kind"), x.get("class"), x.get("category")):
        continue
    print(json.dumps(x, ensure_ascii=False)[:400])
