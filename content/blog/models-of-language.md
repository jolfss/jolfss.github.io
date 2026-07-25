---
title: "Models of Language"
date: 2026-06-25T10:00:00-07:00
draft: true
entry_type: "blog-entry"
authors:
  - name: "Sean Brynjolfsson"
affiliations: []
summary: "A starting note for a thread about what different models imply when they claim to model language."
thread: "models-of-language"
thread_title: "Models of Language"
thread_order: 1
previous: ""
next: ""
---

This is the opening stub for a thread on models of language. The title is intentionally broad: I want a place to compare statistical, linguistic, cognitive, computational, and practical views of what it means to model language.

Modern language models make the phrase feel settled, but it is not obvious that every model in this family is modeling the same thing. Some models are best understood as predictors of strings. Some are systems for compressing distributions over documents. Some behave like interfaces to latent procedures, social conventions, or world models.

{{< sidenote "The useful tension is between language as observable text and language as a trace of something else: intent, knowledge, convention, environment, or computation." />}}

Likely directions for this thread:

- What counts as a model of language rather than a model of text?
- How much linguistic structure has to be explicit before it matters?
- What do next-token objectives explain well, and where do they become the wrong abstraction?
- How should evaluation change if the target is language use rather than string prediction?

---

The first full post should probably set up a taxonomy: language as sequence, language as grammar, language as communication, language as behavior, and language as interface. That taxonomy can become a scaffold for later posts.
