---
featured: true
date: "2023-12-15"
title: "Visual Navigation with Traversability Priors"
description: |
  ### Visual Navigation with Traversability Priors
  ##### Sean Brynjólfsson\*, [William Pinstrup Huey\*](https://willhuey.com/)

  Continuing our work with open-vocabulary traversability, we were interested in training smaller models on specific traversability scenarios. Our original model was too large to fit on the ANYmal's NVIDIA Jetson processor and its inference speed was quite slow (~7s). Since we did not experiment with prompts that changed during rollout, we were wasting a lot of compute by preserving its open-vocabulary capabilities. Thus we chose to train a smaller model on the bigger model with a fixed prompt. For example, "you are a robot who cannot climb stairs". Model distillation is not so interesting on its own, but being able to do so over an abstract description of traversability is quite useful.

  In this paper, we demonstrate that weak traversability priors can be obtained from large open vocabulary image segmentation models and that they appear to be consistent across environments. We then apply model distillation techniques to train a smaller traversability prediction network capable of real time inference, and demonstrate a heuristic that uses this distilled network to perform obstacle avoidance when roaming freely. 

media: 
  - content: "anymal_site.gif"
    alt_text: "..."
  - content: "mapping.png"
    alt_text: "..."
  - content: "visual_trav.jpg"
    alt_Text: "..."
links:
  # - url: ""
  #   text: "Github"
---
