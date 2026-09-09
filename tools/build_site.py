#!/usr/bin/env python3
"""Build the dashboard into _site/: the pages from site/, the raw records from
data/, and series.json, one columnar file with every metric of every record."""

import glob
import json
import os
import shutil

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def series(records):
    ids = sorted({m for r in records for m in r["metrics"]})
    return {
        "commits": [{"sha": r["commit"], "date": r["committed_at"]} for r in records],
        "metrics": {m: [r["metrics"].get(m) for r in records] for m in ids},
    }


def main():
    records = []
    for path in glob.glob(os.path.join(root, "data", "*", "*", "*.json")):
        with open(path) as f:
            records.append(json.load(f))
    records.sort(key=lambda r: r["committed_at"])

    out = os.path.join(root, "_site")
    shutil.rmtree(out, ignore_errors=True)
    shutil.copytree(os.path.join(root, "site"), out)
    shutil.copytree(os.path.join(root, "data"), os.path.join(out, "data"))
    with open(os.path.join(out, "series.json"), "w") as f:
        json.dump(series(records), f, separators=(",", ":"))
    print(f"{len(records)} records -> {out}")


if __name__ == "__main__":
    main()
