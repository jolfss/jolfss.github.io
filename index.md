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
  display: grid;
  grid-template-columns: 30% 65%; 
  grid-column-gap: 20px; 
  margin-bottom: 30px;
  width: 100%;
}

.project .image-container {
  display: flex;
  flex-direction: column; 
}

.project img {
  width: 100%; 
  max-height: 300px; 
  object-fit: cover; 
  margin-bottom: 10px; 
}

.project .project-text {
  width: 100%; 
}

@media (max-width: 800px) {
  .project {
    grid-template-columns: 100%; 
  }

  .project img, .project .project-text {
    margin: 0;
  }
}


</style>

<div class="projects-container">

  <!-- GRIG Project -->
  <div class="project">
    <div class="image-container">
        <img src="assets/grig1.gif" alt="TODO" />
        <img src="assets/grig2.gif" alt="TODO" />
    </div>
    <div class="project-text">
      <h2>Auto-Riggable Gaussian Characters</h2>
      <p><strong>Description:</strong> Current project.</p>
      <a href="https://github.com/jolfss/grig">GitHub Repo</a>
    </div>
  </div>

  <!-- Visual Navigation Project -->
  <div class="project">
    <div class="image-container">
      <img src="assets/anymal_construction.gif" alt="TODO">
      <img src="assets/spliced.png" alt="TODO">
    </div>
    <div class="project-text">
      <h2>Visual Navigation with Traversability Priors</h2>
      <p><strong>Description:</strong> TODO</p>
      <a href="files/VisualNavTravPriors.pdf">View or Download PDF</a>
    </div>
  </div>

  <!-- Let it SIMmer Project -->
  <div class="project">
    <div class="image-container">
      <img src="assets/ovseg.png" alt="Let it SIMmer">
    </div>
    <div class="project-text">
      <h2>Let it SIMmer</h2>
      <p><strong>Description:</strong> TODO</p>
      <a href="files/LetItSIMmer.pdf">View or Download PDF</a>
    </div>
  </div>

  <!-- QCLL Project -->
  <div class="project">
    <div class="image-container">
      <img src="assets/qcll.png" alt="TODO">
    </div>
    <div class="project-text">
      <h2>Quantitative-Competitive Language Learning</h2>
      <p><strong>Description:</strong> A hobby project attempting to use language models as a model of language to score humans on their ability to write in a foreign language.</p>
      <a href="https://github.com/jolfss/qcll">GitHub Repo</a>
    </div>
  </div>

  <!-- Compositional Splatting Project -->
  <div class="project">
    <div class="image-container">
      <img src="assets/gaussian_seg.png" alt="TODO">
    </div>
    <div class="project-text">
      <h2>Compositional Splatting for Construction Sites</h2>
      <p><strong>Description:</strong>TODO</p>
      <a href="https://github.com/jolfss/grig">GitHub Repo</a> | <a href="files/SplatConstruction.pdf">View or Download PDF</a>
    </div>
  </div>

  <!-- LLMímir Project -->
  <div class="project">
    <div class="image-container">
      <img src="assets/llmimir_voices.png" alt="TODO">
      <img src="assets/llmimir_inflection.png" alt="TODO">
    </div>
    <div class="project-text">
      <h2>LLMímir: Evaluating GPT-4 on Old Norse Verbs</h2>
      <p><strong>Description:</strong>TODO</p>
      <a href="files/LLMímir.pdf">View or Download PDF</a>
    </div>
  </div>

</div>
