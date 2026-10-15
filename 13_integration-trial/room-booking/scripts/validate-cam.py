"""CamModule（model/rsv.cam.json）を CON-04 の components.schemas.CamModule で検証し、
アプリが PDP に渡す (resource.type, action.name) が catalog 対象の動詞 permission に含まれることを確かめる
（INT-03 §15.2 S-3・S-5、N-24・N-26、INT-02 AN-5）。
使い方: python scripts/validate-cam.py  （リポジトリの 11_contracts を読む）
"""
import json, pathlib, sys
import yaml
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

here = pathlib.Path(__file__).resolve().parent.parent
repo = here.parent.parent
con04 = yaml.safe_load((repo / "11_contracts/relationship-model-registry.openapi.yaml").read_text(encoding="utf-8"))
common = json.loads((repo / "11_contracts/schemas/common.schema.json").read_text(encoding="utf-8"))

root = {"$schema": "https://json-schema.org/draft/2020-12/schema", "$id": "https://local.invalid/con04/root.json", "components": con04["components"],
        "$ref": "#/components/schemas/CamModule"}
registry = Registry().with_resources([
    ("https://local.invalid/con04/root.json", Resource.from_contents(root)),
    ("https://local.invalid/con04/schemas/common.schema.json", Resource.from_contents(common)),
])
# CON-04 は ./schemas/common.schema.json を相対参照するので、root の $id からの相対位置に置く
cam = json.loads((here / "model/rsv.cam.json").read_text(encoding="utf-8"))
v = Draft202012Validator(root, registry=registry)
errors = sorted(v.iter_errors(cam), key=lambda e: list(e.path))
for e in errors:
    print("SCHEMA-ERROR", list(e.path), e.message)

# catalog 対象 = 保持者集合（複数形）・補助 permission を除いた動詞（N-24）
HOLDER_SETS = {"administrators", "bookers"}
catalog = {(t["name"], p["name"]) for t in cam["types"] for p in t.get("permissions", []) if p["name"] not in HOLDER_SETS}
ledger = json.loads((here / "ledger/entry-points.json").read_text(encoding="utf-8"))
sent = set()
for ep in ledger["entry_points"]:
    sent.add((ep["resource_type"], ep["action"]))
    if "container" in ep:
        sent.add((ep["container"]["resource_type"], ep["container"]["action"]))
missing = sorted(sent - catalog)
print("catalog:", sorted(catalog))
print("sent-by-app:", sorted(sent))
print("NOT-IN-CATALOG:", missing)
sys.exit(1 if errors or missing else 0)
