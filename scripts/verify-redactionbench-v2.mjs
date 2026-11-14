import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
const context = { document: { querySelector: () => null }, __REDACTIONBENCH_TEST__: true };
vm.createContext(context);
for (const file of ['redactionbench-v2-examples.js', 'redactionbench-v2.js']) {
    vm.runInContext(readFileSync(new URL('../assets/js/' + file, import.meta.url), 'utf8'), context);
}
const rb = context.__REDACTIONBENCH;
const e = (kind, content, syntax = []) => ({ kind, content: content.map(([start, end]) => ({ start, end })), syntax: syntax.map(([start, end]) => ({ start, end })) });
const text = 'AB-1234 and Example Labs at Library.';
const entities = [e('mandatory', [[0, 2], [3, 7]], [[2, 3]]), e('contextual', [[12, 19], [20, 24]], [[19, 20]]), e('benign', [[28, 35]])];
const score = (pred) => rb.scoreV2(text, entities, pred);
assert.equal(score([]).value, 0);
assert.equal(score([[0, 2]]).value, .5);
assert.equal(score([[0, 7]]).value, 1);
assert.equal(score([[0, 2], [3, 7]]).value, 1);
assert.equal(score([[0, 7], [12, 24]]).value, 1);
assert.equal(score([[0, 7], [12, 19]]).value, 2 / 3);
assert.equal(score([[0, 7], [19, 20]]).value, .5);
assert.equal(score([[0, 7], [28, 35]]).value, .5);
assert.equal(score([[0, 12]]).backgroundPenalty, 2);
assert.equal(score([[0, 8], [10, 11]]).backgroundPenalty, 2);
assert.equal(rb.scoreV2('safe', [], []).value, 1);
assert.equal(rb.scoreV2('safe', [], [[0, 4]]).value, 1 / 3);
const optional = rb.scoreComparisons(entities, [[0, 2], [3, 7], [12, 19]]);
assert.equal(optional.benign_f1, .8);
assert.equal(optional.mandatory_f1, 6 / 7);
// Optional inclusion optimizes whole groups; here adding both improves 4/5 to 6/7.
assert.equal(optional.optional_f1, 6 / 7);
const partialMatch = rb.scoreComparisons([e('mandatory', [[0, 2], [3, 7]], [[2, 3]])], [[0, 7]]);
assert.equal(partialMatch.benign_f1, 0);
assert(Math.abs(partialMatch.benign_soft_f1 - 8 / 21) < 1e-12);
assert.equal(partialMatch.optional_soft_f1, partialMatch.benign_soft_f1);
const groupedOptional = rb.scoreComparisons([e('mandatory', [[0, 2]]), e('contextual', [[4, 6], [8, 10], [12, 14]])], [[0, 2], [4, 6]]);
assert(Math.abs(groupedOptional.optional_soft_f1 - 2 / 3) < 1e-12);

const demoBenign = rb.buildDemoSample().entities.filter((entity) => entity.kind === 'benign');
assert.equal(demoBenign.length, 9);
assert(demoBenign.every((entity) => entity.content.length === 1 && entity.syntax.length === 0));
assert.equal(rb.gallerySamples.length, 11);
for (const sample of rb.gallerySamples) {
    assert(sample.benign.length > 0);
    assert(sample.entities.filter((entity) => entity.kind === 'benign').every((entity) => entity.syntax.length === 0));
    const html = rb.renderLabeledText(sample.text, sample.hard, sample.contextual, sample.combinators, null, null, 'contextual', sample.benign);
    assert(html.includes('rb-benign'));
}
if (process.argv[2]) {
    let state = 82;
    const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    const fixtures = [...rb.gallerySamples, rb.buildDemoSample(), {text: 'x'.repeat(22), entities: [e('contextual', [[0, 3], [10, 13]]), e('mandatory', [[5, 8]]), e('contextual', [[15, 18]])], hard: [{start:5,end:8}], contextual: [{start:0,end:3},{start:10,end:13},{start:15,end:18}], benign: []}].map((sample) => {
        const masks = [[], [[0, sample.text.length]], sample.hard, [...sample.hard, ...sample.contextual], sample.benign];
        for (let i = 0; i < 15; i++) {
            const mask = [];
            for (let j = 0; j < 8; j++) {
                const start = Math.floor(random() * sample.text.length);
                mask.push([start, Math.min(sample.text.length, start + 1 + Math.floor(random() * 35))]);
            }
            masks.push(mask);
        }
        return { length: sample.text.length, entities: sample.entities, cases: masks.map((predictions) => ({ predictions, rscore: rb.scoreV2(sample.text, sample.entities, predictions), comparisons: rb.scoreComparisons(sample.entities, predictions) })) };
    });
    writeFileSync(process.argv[2], JSON.stringify(fixtures));
}
console.log('Verified revised R-Score, Soft-F1 one-to-one matching, whole-entity optional comparisons, and benign labels in all 11 existing documents.');
