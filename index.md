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
  grid-template-columns: 38% 62%; 
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
      <h3 align=center><a href="https://github.com/jolfss/grig"><b>GitHub Repo</b></a>
      </h3>
    </div>
  </div>

  <!-- Let it SIMmer Project, VoxSeg, OVT -->
  <div class="project">
    <div class="image-container">
      <img src="assets/ovseg1.png" alt="TODO">
      <img src="assets/ovseg2.png" alt="TODO">
      <img src="assets/labels.png" alt="TODO">
      <img src="assets/voxseg.png" alt="TODO">
      <!--
      <img src="assets/ovt-network-arch.png" alt="TODO">
      <img src="assets/isaacstage.png" alt="TODO">
      -->
    </div>
    <div class="project-text">
      <h2>Let it SIMmer / OVT</h2>
      <p><b>Credits:</b> Sean Brynjólfsson, Will Huey</p>
      <p><b>Description:</b>
      Generalizing to new and dynamic environments is a significant challenge in mobile robotics. Recently, vision-aware models have become much more prevalent. These models are capable of producing robust semantic features that make framing and generalizing to downstream tasks, navigation, significantly easier. Images are rich enough to characterize many cues that geometric information alone does not provide---ice is slippery, puddles aren't bottomless voids, that concrete is wet (an orange prop-up nearby reads 'wet concrete', even though it looks dry).
      <br><br>
      Three implementations comprise our overall method. In total, this is a three-part system that allows for asynchronous streaming of data from a robot to a datacenter/compute-capable device which then responds to classification requests from a user in either Isaac Sim or Rviz.
      <ol>
        <li><b>Voxvis:</b> An extension for NVIDIA Omniverse's Isaac Sim to interface with the voxel segmentations; we also provide a similar accompanying Rviz visualization. Communication between the modules is implemented in ROS, making it suitable for both live, simulated, and replay data.
        </li><li>
        <b>OVT:</b> An open-vocabulary traversability segmentation framework. This is a ros node that processes incoming RGB-D images and extracts embeddings for each pixel and then bundles it with odometry and pose data from the robot. (We don't collapse the embeddings into a classification yet, we let it <i>SIMmer</i>)
        </li><li>
        <b>Voxseg:</b> A bridge between OVT and Voxvis, Voxseg simultaneously updates the internal voxelized embeddings and handles requests from Voxvis for a particular user-specified, open-vocabulary classification over them. 
        </li>
      </ol>
      We also implemented other helpful tools to generate environments in Omniverse, such as construction sites and forested scenes, (<a href="https://github.com/jolfss/isaac_stage/tree/main/isaac_stage">Isaac Stage GitHub</a>). <i>NOTE: This has <b>not</b> been updated to the latest major version of Isaac Sim/Orbit.</i>
      </p>
      <h3 align="center"><a href="https://github.com/willh003/ovt"><b>GitHub Repo</b></a> 
      | <a href="files/LetItSIMmer.pdf"><b>Paper</b></a></h3>
    </div>
  </div>

  <!-- Visual Navigation Project -->
  <div class="project">
    <div class="image-container">
      <!--<img src="assets/anymal_construction.gif" alt="TODO">-->
      <img src="assets/anymal_site.gif" alt="TODO">
      <img src="assets/spliced.png" alt="TODO">
      <img src="assets/visual_trav.jpg" alt="TODO">
    </div>
    <div class="project-text">
      <h2>Visual Navigation with Traversability Priors</h2>
      <p><b>Credits:</b> Sean Brynjólfsson, Will Huey</p>
      <p><b>Description:</b> 
      Continuing off our work with OVT, we wanted to speed up inference and also use less space for simulation and smaller devices. For this, we no longer needed the flexibility of the open-vocabulary portion if we could find a consistent set of labels which told it generically what things are traversable and what things aren't. To our earlier surprise, labels akin to "traversable" and "untraversable" seemed to have a good representation, so we simply went with that. We understood that vision models can "factor out" the environment when classifying objects, but for abstract concepts like "traversable" and "untraversable" we did not expect it to do nearly as well as it does (maybe more people are describing things as traversable and untraversable in image captions than it seems?).
      <br><br>
      The question we investigated was thus whether or not the source model's generalization would also distill to the student model. I.e., whether or not the student model also learns to "avoid water" [because water is not traversable] and not "avoid water" [that looks <i>just</i> like the bad water in training data]. To investigate this, we distilled the larger open-vocabulary model and then used it as a traversability prior in a simple visual navigation framework.
      <br><br>       
      In this paper, we demonstrate that weak traversability priors can be obtained from large open vocabulary image segmentation models and that they appear to be consistent across environments. We then apply model distillation techniques to train a smaller traversability prediction network capable of real time inference, and demonstrate a heuristic that uses this distilled network to perform obstacle avoidance when roaming freely.
      </p>
      <h3 align=center><a href="files/VisualNavTravPriors.pdf"><b>Paper</b></a></h3>
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
