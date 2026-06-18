#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const require = createRequire(import.meta.url);

globalThis.document = { querySelector: () => null };
globalThis.__REDACTIONBENCH_TEST__ = true;
require(path.join(repoRoot, 'assets/js/redactionbench-data.js'));
require(path.join(repoRoot, 'assets/js/redactionbench.js'));

const rb = globalThis.__REDACTIONBENCH;
if (!rb) throw new Error('RedactionBench site test exports were not initialized.');

function normalizeSpan(span) {
    return { start: Number(span.start ?? span[0]), end: Number(span.end ?? span[1]) };
}

function normalizeSpans(spans) {
    return (spans || [])
        .map(normalizeSpan)
        .filter((span) => span.end > span.start)
        .sort((left, right) => left.start - right.start || left.end - right.end);
}

function sameJson(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
}

const records = rb.gallerySamples.map((sample) => ({
    id: `gallery:${sample.category}/${sample.genre}`,
    text: sample.text,
    hard: normalizeSpans(sample.hard),
    contextual: normalizeSpans(sample.contextual),
    combinators: normalizeSpans(sample.combinators)
}));

const demo = rb.buildDemoSample();
records.push({
    id: 'demo:interactive-r-score',
    text: demo.text,
    hard: normalizeSpans(demo.hard),
    contextual: normalizeSpans(demo.contextual),
    combinators: normalizeSpans(demo.combinators)
});

const python = spawnSync('python3', ['-c', String.raw`
import json
import os
import sys

sys.path.insert(0, os.environ.get("REDACTIONBENCH_SRC", "/Users/sbrynjolfson/a10/pii-redaction/src"))
from redactionlib._evaluation._metrics import effective_yellow_combinator_spans

records = json.load(sys.stdin)
out = []
for record in records:
    spans = effective_yellow_combinator_spans(
        [(span["start"], span["end"]) for span in record["hard"]],
        [(span["start"], span["end"]) for span in record["contextual"]],
        text=record["text"],
    )
    out.append({
        "id": record["id"],
        "spans": [{"start": int(start), "end": int(end)} for start, end in spans],
    })
json.dump(out, sys.stdout, sort_keys=True)
`], {
    cwd: repoRoot,
    input: JSON.stringify(records),
    encoding: 'utf8'
});

if (python.status !== 0) {
    process.stderr.write(python.stderr || python.stdout);
    process.exit(python.status || 1);
}

const reference = new Map(JSON.parse(python.stdout).map((item) => [item.id, normalizeSpans(item.spans)]));
const failures = [];
for (const record of records) {
    const expected = reference.get(record.id);
    if (!sameJson(record.combinators, expected)) {
        failures.push(`${record.id}: generated renderer combinators differ\n  generated=${JSON.stringify(record.combinators)}\n  python=${JSON.stringify(expected)}`);
    }
}

if (failures.length) {
    console.error(`RedactionBench renderer verification failed (${failures.length} mismatch${failures.length === 1 ? '' : 'es'}).`);
    console.error(failures.join('\n'));
    process.exit(1);
}

console.log(`Verified Python-generated renderer labels for ${records.length} RedactionBench records.`);
