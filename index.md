---
layout: default
title: My Projects
---

<style>
.projects-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.project {
  display: flex;
  margin-bottom: 30px;
  width: 100%;
}

.project img {
  width: 40%;
  margin-right: 20px;
}

.project .project-text {
  width: 55%;
}

@media (max-width: 800px) {
  .project {
    flex-direction: column;
  }

  .project img, .project .project-text {
    width: 100%;
    margin: 0;
  }
}
</style>

<div class="projects-container">

  <!-- GRIG Project -->
  <div class="project">
    <img src="path-to-image/grig-image.jpg" alt="GRIG Project">
    <div class="project-text">
      <h2>GRIG: Auto-riggable Gaussian Characters</h2>
      <p><strong>Description:</strong> Current project.</p>
      <p><strong>Tech Stack:</strong> Python, PyTorch, Dynamic3DGaussians</p>
      <a href="https://github.com/jolfss/grig">GitHub Repo</a>
    </div>
  </div>

  <!-- Visual Navigation Project -->
  <div class="project">
    <img src="path-to-image/visual-navigation-image.jpg" alt="Visual Navigation with Traversability Priors">
    <div class="project-text">
      <h2>Visual Navigation with Traversability Priors</h2>
      <p><strong>Description:</strong> TODO</p>
      <p><strong>Tech Stack:</strong> Omniverse, Isaac Sim/Orbit, ANYmal C/D</p>
      <a href="files/VisualNavTravPriors.pdf">View or Download PDF</a>
    </div>
  </div>

  <!-- Let it SIMmer Project -->
  <div class="project">
    <img src="path-to-image/let-it-simmer-image.jpg" alt="Let it SIMmer">
    <div class="project-text">
      <h2>Let it SIMmer</h2>
      <p><strong>Description:</strong> TODO</p>
      <p><strong>Tech Stack:</strong> Omniverse, Isaac Sim/Orbit, ANYmal C</p>
      <a href="https://github.com/jolfss/qcll">GitHub Repo</a> | <a href="files/LetItSIMmer.pdf">View or Download PDF</a>
    </div>
  </div>

  <!-- QCLL Project -->
  <div class="project">
    <img src="path-to-image/qcll-image.jpg" alt="QCLL: Quantitative-Competitive Language Learning">
    <div class="project-text">
      <h2>QCLL: Quantitative-Competitive Language Learning</h2>
      <p><strong>Description:</strong> A hobby project attempting to use language models as a model of language to score humans on their ability to write in a foreign language.</p>
      <p><strong>Tech Stack:</strong> Python, PyTorch, HuggingFace</p>
      <a href="https://github.com/jolfss/qcll">GitHub Repo</a>
    </div>
  </div>

  <!-- Compositional Splatting Project -->
  <div class="project">
    <img src="path-to-image/compositional-splatting-image.jpg" alt="Compositional Splatting for Construction Sites">
    <div class="project-text">
      <h2>Compositional Splatting for Construction Sites</h2>
      <p><strong>Description:</strong> TODO</p>
      <p><strong>Tech Stack:</strong> Python, PyTorch, Omniverse, Isaac Sim</p>
      <a href="https://github.com/jolfss/grig">GitHub Repo</a> | <a href="files/SplatConstruction.pdf">View or Download PDF</a>
    </div>
  </div>

  <!-- LLMímir Project -->
  <div class="project">
    <img src="path-to-image/llmimir-image.jpg" alt="LLMímir: Evaluating GPT-4 on Old Norse Verbs">
    <div class="project-text">
      <h2>LLMímir: Evaluating GPT-4 on Old Norse Verbs</h2>
      <p><strong>Description:</strong> Description pending.</p>
      <p><strong>Tech Stack:</strong> Python, OpenAI API</p>
      <a href="files/LLMímir.pdf">View or Download PDF</a>
    </div>
  </div>

</div>
