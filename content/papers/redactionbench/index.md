---
title: "RedactionBench"
date: 2026-06-17
slug: "redactionbench"
url: "/papers/redactionbench/v2/"
aliases:
  - /papers/redactionbench/
paper_version: "v2"
redactionbench_v2: true
redactionbench_script: "js/redactionbench-v2.js"
redactionbench_data: "js/redactionbench-v2-examples.js"
layout: "redactionbench"
entry_type: "paper"
draft: false
redactionbench: true
summary: "As we integrate intelligent systems beside sensitive and private data, we need the ability to redact information to balance utility and safety."
abstract: >-
  As we integrate intelligent systems beside sensitive and private data, we need the ability to redact information to balance utility and safety. In RedactionBench, we pose redaction as a property detection task, thereby transcending any particular taxonomy to discuss frameworks of machine privacy directly. We introduce RedactionBench, a challenging set of 200 diverse documents which have been exhaustively manually annotated for sensitive content, and the R-Score, our metric designed to nullify shallow formatting decisions. In our user study, we demonstrate users have differing privacy expectations and that these differences are concentrated in our contextual units: mean pairwise agreement of mandatory (81.7%), benign (84.1%), and background units (88.7%), are significantly higher than our contextual units (63.8%). We provide comprehensive evaluations of 44 models across a wide range of architectures. While Claude Opus 5.5 scores the highest at 0.832, we demonstrate that a simple base Qwen3.8-27B in the mini-swe-agent harness achieves 0.740, outperforming the strongest PII-specific model, PII-Tracer, by +13.83%.
authors:
  - name: "Sean Brynjólfsson"
    url: "/"
    affiliation: "a10"
    corresponding: true
    email: "sbrynjolfson@a10networks.com"
  - name: "Shashvat Jayakrishnan"
    url: "https://www.linkedin.com/in/shashvatjk/"
    affiliation: "a10"
  - name: "Esha Sali"
    url: "https://www.linkedin.com/in/esha-sali-bab284205"
    affiliation: "a10"
  - name: "Diptanshu Purwar"
    url: "https://www.linkedin.com/in/diptanshu-purwar/"
    affiliation: "a10"
  - name: "Madhav Aggarwal"
    url: "https://madhavaggar.github.io/"
    affiliation: "a10"
affiliations:
  - id: "a10"
    name: "A10 Networks, Inc."
sponsor:
  name: "A10 Networks, Inc."
  mark: "A10"
  logo_light: "assets/A10-NewLogos-Blue-NoReg-RGB.png"
  logo_dark: "assets/A10-NewLogos-White-NoReg-RGB.png"
  url: "https://www.a10networks.com/products/a10-ai-firewall/"
links:
  - label: "arXiv"
    icon: "📄"
    url: "https://arxiv.org/abs/2606.18782"
  - label: "Hugging Face"
    icon: "🤗"
    url: "https://huggingface.co/datasets/A10Networks/RedactionBench"
  - label: "CC BY 4.0"
    icon: "⚖️"
    url: "https://creativecommons.org/licenses/by/4.0/"
bibtex: |
  @misc{brynjolfsson2026redactionbench,
    title         = {RedactionBench},
    author        = {Brynjólfsson, Sean and Jayakrishnan, Shashvat and Sali, Esha and Purwar, Diptanshu and Aggarwal, Madhav},
    year          = {2026},
    eprint        = {2606.18782},
    archivePrefix = {arXiv},
    primaryClass  = {cs.CL},
    doi           = {10.48550/arXiv.2606.18782},
    url           = {https://arxiv.org/abs/2606.18782}
  }
---

## Evaluations

<figure class="paper-figure">
    <div class="paper-figure-frame">
        <img src="assets/v2/params_rscore_pareto.png" alt="Pareto plot of RedactionBench mean R-Score against model size." loading="lazy" decoding="async">
    </div>
    <figcaption>Total checkpoint parameter count versus R-Score.</figcaption>
</figure>

### Overall Model Leaderboard

| Rank | Model | Family | R-Score mean |
|---:|---|---|---:|
| 1 | `Claude Opus 5.5` | General-purpose agent | 0.832 |
| 2 | `Claude Haiku 5.5` | General-purpose agent | 0.812 |
| 3 | `GPT-6.1 Sol` | General-purpose agent | 0.750 |
| 4 | `Qwen3.8-27B agent` | General-purpose agent | 0.740 |
| 5 | `GPT-6 Luna` | General-purpose agent | 0.686 |
| 6 | `Perplexity PII-Tracer` | Token-level | 0.601 |
| 7 | `CobuildX 17M` | Token-level | 0.536 |
| 8 | `CobuildX 32M` | Token-level | 0.535 |
| 9 | `OpenAI Privacy Filter` | Token-level | 0.533 |
| 10 | `CobuildX 68M` | Token-level | 0.532 |
| 11 | `Qwen3.5-9B agent` | General-purpose agent | 0.469 |
| 12 | `Fastino GLiNER2 PII` | Span-level | 0.445 |
| 13 | `Gretel GLiNER bi-large` | Span-level | 0.427 |
| 14 | `LiquidAI LFM2.5 PII` | Token-level | 0.404 |
| 15 | `Qwen3.5-4B agent` | General-purpose agent | 0.393 |
| 16 | `Bards PII v3` | Token-level | 0.390 |
| 17 | `HydroxAI PII Masker` | Token-level | 0.387 |
| 18 | `OpenMed SuperClinical PII` | Token-level | 0.381 |
| 19 | `Jakobhuss Gemma 270M` | Specialized generator | 0.370 |
| 20 | `HiveTrace GLiNER Guard uni` | Span-level | 0.341 |
| 21 | `B2NER InternLM2.5 7B` | Specialized generator | 0.339 |
| 22 | `NVIDIA GLiNER PII` | Span-level | 0.339 |
| 23 | `Distil-PII Llama 3B` | Specialized generator | 0.332 |
| 24 | `Piiranha v1` | Token-level | 0.321 |
| 25 | `Knowledgator GLiNER PII` | Span-level | 0.320 |
| 26 | `HiveTrace GLiNER Guard bi` | Span-level | 0.313 |
| 27 | `GLiNER multi-PII` | Span-level | 0.309 |
| 28 | `E3-JSI GLiNER PII` | Span-level | 0.302 |
| 29 | `Eternis Anonymizer 4B` | Specialized generator | 0.281 |
| 30 | `NuExtract 1.5 tiny` | Specialized generator | 0.277 |
| 31 | `UniNER 7B all` | Specialized generator | 0.270 |
| 32 | `DeepakSiloka PII v2.1` | Token-level | 0.263 |
| 33 | `h2oai DeBERTa PII` | Token-level | 0.238 |
| 34 | `Lakshyakh93 DeBERTa PII` | Token-level | 0.238 |
| 35 | `NuExtract 2.0 2B` | Specialized generator | 0.238 |
| 36 | `Isotonic DistilBERT v2` | Token-level | 0.232 |
| 37 | `ai4privacy English` | Token-level | 0.221 |
| 38 | `NuExtract 2.0 4B` | Specialized generator | 0.206 |
| 39 | `Tanaos anonymizer` | Token-level | 0.201 |
| 40 | `GLiNER multi v2.1` | Span-level | 0.194 |
| 41 | `Distil-PII Llama 1B` | Specialized generator | 0.192 |
| 42 | `ai4privacy multilingual` | Token-level | 0.180 |
| 43 | `Distil-PII Gemma 270M` | Specialized generator | 0.092 |
| 44 | `OpenPipe PII-Redact` | Specialized generator | 0.092 |

† `h2oai/deberta_finetuned_pii` and `lakshyakh93/deberta_finetuned_pii` are mirrored uploads of the same checkpoint and produce identical scores.
