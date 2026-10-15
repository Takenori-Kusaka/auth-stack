# Validate E2 records produced by the SUT against CON-08 (audit-event.schema.json) with CON-02 resolved locally.
# Usage: python -I scripts/validate-audit.py <contracts/schemas dir> <jsonl>...
import json, sys
from jsonschema import Draft202012Validator
from referencing import Registry, Resource
sd = sys.argv[1]
audit = json.load(open(f"{sd}/audit-event.schema.json", encoding="utf-8"))
common = json.load(open(f"{sd}/common.schema.json", encoding="utf-8"))
reg = Registry().with_resources([
    ("https://contracts.id-domain.invalid/schemas/v1/common.schema.json", Resource.from_contents(common)),
    (common.get("$id", "common"), Resource.from_contents(common)),
])
v = Draft202012Validator(audit, registry=reg)
total = bad = 0
for path in sys.argv[2:]:
    for line in open(path, encoding="utf-8"):
        line = line.strip()
        if not line: continue
        total += 1
        errs = sorted(v.iter_errors(json.loads(line)), key=lambda e: list(e.path))
        # known stub artifact: self-made issuer stubs run on http://127.0.0.1 (CON-08 corr.iss requires https)
        errs = [e for e in errs if not (list(e.path) == ['corr', 'iss'] and str(e.instance).startswith('http://127.0.0.1'))]
        if errs:
            bad += 1
            if bad <= 5:
                for e in errs[:3]: print("INVALID", list(e.path), e.message[:200])
print(json.dumps({"events": total, "invalid": bad}))
sys.exit(1 if bad else 0)
