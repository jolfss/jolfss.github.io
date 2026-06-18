#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import random
from collections import defaultdict
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATASET_ARROW = (
    Path("/Users/sbrynjolfson/a10/pii-redaction/lib/RedactionBench")
    / "_redactionbench_release"
    / "data"
    / "test"
    / "data-00000-of-00001.arrow"
)
SOURCE_PATH = REPO_ROOT / "data" / "redactionbench" / "source.json"
DEFAULT_SEED = "redactionbench-site-examples-2026-06-18"


def load_arrow_rows(path: Path) -> list[dict[str, Any]]:
    try:
        import pyarrow as pa
        import pyarrow.ipc as ipc
    except ModuleNotFoundError as exc:
        raise SystemExit(
            "pyarrow is required to reroll examples. "
            "Use a temporary venv, e.g. `python3 -m venv /tmp/rb-arrow && "
            "/tmp/rb-arrow/bin/python -m pip install pyarrow`, then run this script with that Python."
        ) from exc

    with pa.memory_map(str(path), "r") as source:
        reader = ipc.RecordBatchStreamReader(source)
        return reader.read_all().to_pylist()


def span_payload(row: dict[str, Any]) -> list[list[Any]]:
    return [
        [int(span["start"]), int(span["end"]), str(span["label"])]
        for span in row["spans"]
    ]


def source_record(row: dict[str, Any], row_index: int) -> dict[str, Any]:
    synthetic = bool(row.get("is_synthetic"))
    source = row.get("original_document_url") or None
    return {
        "category": str(row["category"]),
        "genre": str(row["genre"]),
        "meta": f"{'synthetic' if synthetic else 'real'} release row {row_index}",
        "source": source,
        "text": str(row["raw_text"]),
        "spans": span_payload(row),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset-arrow", type=Path, default=DEFAULT_DATASET_ARROW)
    parser.add_argument("--seed", default=DEFAULT_SEED)
    parser.add_argument("--output", type=Path, default=SOURCE_PATH)
    args = parser.parse_args()

    rows = load_arrow_rows(args.dataset_arrow)
    existing = {}
    if args.output.exists():
        source = json.loads(args.output.read_text(encoding="utf-8"))
        existing = {
            str(record["category"]): str(record["genre"])
            for record in source.get("gallerySamples", [])
        }
        demo = source.get("demo")
    else:
        demo = None

    by_category: dict[str, list[tuple[int, dict[str, Any]]]] = defaultdict(list)
    for index, row in enumerate(rows):
        by_category[str(row["category"])].append((index, row))

    rng = random.Random(str(args.seed))
    selected = []
    for category in sorted(by_category):
        candidates = by_category[category]
        previous_genre = existing.get(category)
        filtered = [
            item for item in candidates
            if str(item[1]["genre"]) != previous_genre
        ]
        chosen_index, chosen_row = rng.choice(filtered or candidates)
        selected.append(source_record(chosen_row, chosen_index))

    if demo is None:
        demo = {
            "text": "Login 10.67.2.205 used card 5669 6205 2865 3997 via Visa.",
            "spans": [
                [6, 8, "mandatory"],
                [8, 9, "contextual"],
                [9, 11, "mandatory"],
                [11, 12, "contextual"],
                [12, 13, "mandatory"],
                [13, 14, "contextual"],
                [14, 17, "mandatory"],
                [28, 32, "mandatory"],
                [32, 33, "contextual"],
                [33, 37, "mandatory"],
                [37, 38, "contextual"],
                [38, 42, "mandatory"],
                [42, 43, "contextual"],
                [43, 47, "mandatory"],
                [52, 56, "contextual"],
            ],
        }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(
            {
                "selection": {
                    "method": "one deterministic random row per category, excluding the previous displayed genre when possible",
                    "seed": str(args.seed),
                    "dataset": str(args.dataset_arrow),
                },
                "gallerySamples": selected,
                "demo": demo,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    for record in selected:
        print(f"{record['category']}: {record['genre']} ({record['meta']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
