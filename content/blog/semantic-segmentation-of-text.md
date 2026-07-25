---
title: "Semantic Segmentation of Text"
date: 2026-06-25T09:00:00-07:00
draft: true
entry_type: "blog-entry"
authors:
  - name: "Sean Brynjolfsson"
affiliations: []
summary: "A starting note on treating text as something with regions, boundaries, and segmentation structure rather than only as a token stream."
thread: "semantic-segmentation-of-text"
thread_title: "Semantic Segmentation of Text"
thread_order: 1
previous: ""
next: ""
---

This is the opening stub for a thread on semantic segmentation of text: the idea that documents can be understood as structured fields with regions, transitions, and boundaries, not just as sequences of tokens.

The motivating question is what it would mean to segment text the way we segment images. In images, segmentation asks which pixels belong together because they describe the same object, surface, or semantic region. For text, the analog might be spans that participate in the same claim, role, entity, source, uncertainty state, or rhetorical move.

{{< sidenote "This is probably where my work on redaction, document annotation, and character-level evaluation starts to meet a broader view of document understanding." />}}

Some questions I expect this thread to circle back to:

- What are the natural units of semantic segmentation in prose?
- Are spans, paragraphs, tables, references, and layout features all part of the same segmentation problem?
- When does token-level labeling become too local to capture document structure?
- What would a useful benchmark for this look like?

---

The first real post should probably start by comparing image segmentation with text annotation tasks that already exist: named entity recognition, discourse parsing, citation context extraction, redaction, and document layout analysis. My suspicion is that none of these fully owns the problem, but each gives a useful partial view.
