---
title: "RedactionBench"
date: 2026-06-17
slug: "redactionbench"
entry_type: "paper"
draft: false
redactionbench: true
summary: "An evaluation-only benchmark for character-level redaction across eleven document categories, with 200 manually annotated documents and mandatory/contextual span labels."
abstract: >-
  LLMs are increasingly being applied to sensitive domains that require redacting personally-identifiable
  information (PII) before processing. While redacting PII has become a de facto data-cleaning
  prerequisite, existing benchmarks conflate the mechanics of extraction with the semantics of privacy.
  A phone number in a public directory is not equivalent to one in a medical record. Whether a given
  piece of information constitutes a violation depends heavily on who holds it, why, and in what
  context—fundamentally differentiating the redaction task from simple entity recognition. Grounded
  in this principle of contextual integrity, we introduce RedactionBench, a manually annotated benchmark
  comprising 200 diverse documents across 11 domains, with a majority seeded from real-world sources.
  RedactionBench also introduces a novel character-level redaction metric called R-Score that treats
  semantically similar redactions equally and nullifies the impact of shallow formatting choices
  (e.g., redacting a phone_number as: "(***) ***-****" vs. "**************"). Extensive evaluations
  across Named-Entity Recognition (NER) models, entity-extraction Small Language Models (SLM), and
  frontier LLMs equipped with agentic tools (Claude Opus, OpenAI GPT) demonstrate that contextual
  redaction remains an unsolved problem. Results from our human evaluation (85 participants) on
  RedactionBench reveal a stark dichotomy in privacy perception: annotators show consensus with our
  target labels for mandatory redactions (89.4%) and safe text preservations (94.1%), but fail to
  agree with contextual redactions (47.7%). This variance demonstrates the subjective nature of
  contextual privacy and motivates our evaluation metric R-Score, which decouples contextual ambiguity
  from strict redaction precision. We compare 35 models using RedactionBench across model families
  and report their performance for PII redaction. Finally, we release RedactionBench publicly to
  establish a baseline for future privacy-preserving redaction systems. We hope this benchmark inspires
  a shift towards efficient model design and standardized evaluations for text redaction.
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
  url: "https://www.a10networks.com/"
links:
  - label: "arXiv"
    icon: "📄"
    url: "https://arxiv.org/abs/2606.18782"
  - label: "Soon"
    icon: "🤗"
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
        <img src="assets/model_performance_over_size.png" alt="Pareto plot of RedactionBench mean R-Score against model size." width="1320" height="593" loading="lazy" decoding="async">
    </div>
    <figcaption>Mean R-Score over Model Size</figcaption>
</figure>

### Overall Model Leaderboard

| Rank | Model | Family | R-Score mean |
|---:|---|---|---:|
| 1 | `claude-opus-4-6` | Frontier LLMs | 0.714 |
| 2 | `gpt-5.4` | Frontier LLMs | 0.659 |
| 3 | `Qwen/Qwen3.5-397B-A17B` | Frontier LLMs | 0.592 |
| 4 | `openai/privacy-filter` | OpenAI Privacy Filter | 0.578 |
| 5 | `zai-org/GLM-5.1` | Frontier LLMs | 0.562 |
| 6 | `gretel_gliner_bi_large_v1_0` | GLiNER | 0.472 |
| 7 | `OpenMed/OpenMed-PII-SuperClinical-Large-434M-v1` | DeBERTa-v3 | 0.459 |
| 8 | `B2NER-InternLM2.5` | B2NER | 0.447 |
| 9 | `nvidia_gliner_pii` | GLiNER | 0.421 |
| 10 | `B2NER-InternLM2.5-7B` | B2NER | 0.402 |
| 11 | `jakobhuss/pii-extractor-gemma-3-270m-it` | SLMs / Extractors | 0.401 |
| 12 | `hydroxai_pii_masker` | DeBERTa-v3 | 0.382 |
| 13 | `eternisai/Anonymizer-4B` | SLMs / Extractors | 0.362 |
| 14 | `E3-JSI/gliner-multi-pii-domains-v1` | GLiNER | 0.350 |
| 15 | `iiiorg/piiranha-v1-detect-personal-information` | RoBERTa / Other | 0.343 |
| 16 | `distil-labs/Distil-PII-Llama-3.2-3B-Instruct` | SLMs / Extractors | 0.337 |
| 17 | `urchade/gliner_multi_pii-v1` | GLiNER | 0.329 |
| 18 | `numind/NuExtract-2.0-2B` | SLMs / Extractors | 0.317 |
| 19 | `Universal-NER/UniNER-7B-all` | SLMs / Extractors | 0.316 |
| 20 | `numind/NuExtract-1.5-tiny` | SLMs / Extractors | 0.308 |
| 21 | `knowledgator/gliner-pii-base-v1.0` | GLiNER | 0.304 |
| 22 | `numind/NuExtract-2.0-4B` | SLMs / Extractors | 0.293 |
| 23 | `ai4privacy/llama-english-anonymiser-openpii` | ModernBERT (BIO) | 0.270 |
| 24 | `h2oai/deberta_finetuned_pii` † | DeBERTa-v3 | 0.250 |
| 25 | `lakshyakh93/deberta_finetuned_pii` † | DeBERTa-v3 | 0.250 |
| 26 | `hivetrace/gliner-guard-uniencoder` | GLiNER | 0.235 |
| 27 | `hivetrace/gliner-guard-biencoder` | GLiNER | 0.221 |
| 28 | `Isotonic/distilbert_finetuned_ai4privacy_v2` | DistilBERT (BIO) | 0.216 |
| 29 | `ai4privacy/llama-multilingual-categorical-anonymiser-openpii` | ModernBERT (BIO) | 0.213 |
| 30 | `urchade/gliner_multi-v2.1` | GLiNER | 0.209 |
| 31 | `tanaos/tanaos-text-anonymizer-v1` | RoBERTa / Other | 0.202 |
| 32 | `deepaksiloka/PII-Detection-V2.1` | DistilBERT (BIO) | 0.196 |
| 33 | `distil-labs/Distil-PII-Llama-3.2-1B-Instruct` | SLMs / Extractors | 0.175 |
| 34 | `OpenPipe/PII-Redact-General` | SLMs / Extractors | 0.113 |
| 35 | `distil-labs/Distil-PII-gemma-3-270m-it` | SLMs / Extractors | 0.095 |

† `h2oai/deberta_finetuned_pii` and `lakshyakh93/deberta_finetuned_pii` are mirrored uploads of the same checkpoint and produce identical scores.
