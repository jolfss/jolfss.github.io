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
  grid-template-columns: 38% 57%; 
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
  max-height: 400px; 
  object-fit: cover; 
  margin-bottom: 0px; 
}

.project .project-text {
  width: 100%; 
}

@media (max-width: 600px) {
  .project {
    display: flex; /* Change the project to flex */
    flex-direction: column; /* Stack project components vertically */
    margin-bottom: 0; /* Remove bottom margin */
  }

  .project .image-container {
    display: flex; /* Keep as flex */
    flex-direction: column; /* Stack images vertically */
    overflow-x: auto; /* Allow horizontal scrolling if needed */
    width: 100%; /* Ensure the image container takes full width */
    margin: 0; /* Remove margin */
    padding: 0; /* Remove padding */
  }

  .project img {
    height: auto; /* Maintain aspect ratio */
    width: 100%; /* Set width to 100% to fill the container */
    /*max-height: 200px; /* Set a maximum height */
    object-fit: cover; /* Keep cover to fill the area */
    margin: 0; /* Remove margin around images */
    display: block; /* Ensure images are treated as block elements */
  }

  .project .project-text {
    padding-top: 20px; /* Adjust the value as needed */
  }
}
</style>

<head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.7/MathJax.js?config=TeX-AMS_HTML"></script>
</head>

<div class="projects-container">

  <!-- GRIG Project -->
  <div class="project">
    <div class="image-container">
        <img src="assets/grig1.gif" alt="TODO" />
        <img src="assets/grig2.gif" alt="TODO" />
    </div>
    <div class="project-text">
      <h2>Auto-Riggable Gaussian Characters</h2>
      <h3>(Current Project)</h3>
      <p><b>Credits: </b>Sean Brynjólfsson, Evan Zhang, Justin Tien-Smith</p>
      <p align=justify><b>Description:</b>
      Recently, techniques for solving gaussian splats of dynamic scenes (<a href="https://github.com/JonathonLuiten/Dynamic3DGaussians"><i>Dynamic3DGaussians</i></a>, 2024) have found success in using local rigidity constraints to enforce spatial and temporal consistency. These representations allow for highly granular inspection of both orientation and position of a scene and actors in it through time. 
      <br><br>
      Our project is to take this detailed representation and decompose it into the rigid parts and joints which describe their movement. This procedure makes no assumptions about the anatomy of the dynamic entities within the scene and therefore should work equally well for all people, animals, machines---anything that moves about a discrete set of joints.
      <br><br>
      Our final deliverable will be an animation-ready gaussian rig and a portable format for them. Clustering also massively downsizes the storage requirements because local rigidity means we need to track a mere fraction of the gaussians---certainly not all of them.
      </p>
      <h3><a href="https://github.com/jolfss/grig">GitHub</a></h3>
    </div>
  </div>

  <!-- Let it SIMmer Project, VoxSeg, OVT -->
  <div class="project">
    <div class="image-container">
      <img src="assets/ovseg.png" alt="Let it SIMmer">
    </div>
    <div class="project-text">
      <h2>Let it SIMmer, Open-Vocabulary Traversability</h2>
      <p><b>Credits:</b> Sean Brynjólfsson, Will Huey</p>
      <p><b>Description:</b>
      TODO. 
      </p>
      <h3><a href="https://github.com/willh003/ovt">Github</a> | 
      <a href="files/LetItSIMmer.pdf">View PDF</a></h3>
    </div>
  </div>

  <!-- Visual Navigation Project -->
  <div class="project">
    <div class="image-container">
      <!--<img src="assets/anymal_construction.gif" alt="TODO">-->
      <img src="assets/anymal_site.gif" alt="TODO">
      <img src="assets/spliced.png" alt="TODO">
    </div>
    <div class="project-text">
      <h2>Visual Navigation with Traversability Priors</h2>
      <p><b>Credits:</b> Sean Brynjólfsson, Will Huey</p>
      <p>
      <b>Description:</b> 
      TODO. 
      </p>
      <h3><a href="files/VisualNavTravPriors.pdf">View PDF</a></h3>
    </div>
  </div>


  <!-- Compositional Splatting Project -->
  <div class="project">
    <div class="image-container">
      <img src="assets/gaussian_seg.png" alt="TODO">
    </div>
    <div class="project-text">
      <h2>Compositional Splatting for Construction Sites</h2>
      <p><b>Credits:</b> Sean Brynjólfsson, Evan Zhang, Natalie Leung, Danish Qureshi, Dyllan Hofflich</p>
      <p><b>Description:</b> 
      TODO. 
      </p>
      <h3><a href="files/SplatConstruction.pdf">View PDF</a></h3>
    </div>
  </div>

  <!-- Fractal Raytracer -->
  <div class="project">
    <div class="image-container">
      <img src="assets/fractals.jpg" alt="TODO">
      <img src="assets/fractals2.png" alt="TODO">
    </div>
    <div class="project-text">
      <h2>Fractal Raytracer</h2>
      <p><b>Credits:</b> Sean Brynjólfsson, Jack Otto</p>
      <p><b>Description:</b>
      TODO. 
      </p>
    </div>
  </div>

  <!-- QCLL Project -->
  <div class="project">
    <div class="image-container">
      <img src="assets/qcll.png" alt="TODO">
    </div>
    <div class="project-text">
      <h2>Quantitative-Competitive Language Learning</h2>
      <p><b>Credits:</b> Sean Brynjólfsson</p>
      <p><b>Description:</b> 
      TODO. 
      </p>
      <h3><a href="https://github.com/jolfss/qcll">GitHub</a></h3>
    </div>
  </div>

  <!-- LLMímir Project -->
  <div class="project">
    <div class="image-container">
      <img src="assets/llmimir_inflection.png" alt="TODO">
      <img src="assets/llmimir_voices.png" alt="TODO">
    </div>
    <div class="project-text">
      <h2>LLMímir: Evaluating GPT-4 on Old Norse Verbs</h2>
      <p><b>Credits:</b> Sean Brynjólfsson</p>
      <p><b>Description:</b>
      TODO. 
      </p>
      <h3><a href="files/LLMímir.pdf">View PDF</a></h3>
    </div>
  </div>

</div>
