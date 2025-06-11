---
featured: true
date: "2024-12-15"
description: |
  ### Automatically-Rigged Gaussian Characters
  ##### Sean Brynjólfsson\*, Justin Tien-Smith\*, Evan Zhang\*
  Recently, techniques for solving gaussian splats of dynamic scenes ([Dynamic3DGaussians](https://github.com/JonathonLuiten/Dynamic3DGaussians), 2024) have found success in using local rigidity constraints to enforce spatial and temporal consistency.

  We use this detailed representation and decompose it into the rigid parts and joints which describe their movement. This procedure makes no assumptions about the anatomy of the dynamic entities within the scene and therefore should work equally well for all people, animals, machines---anything that moves about a discrete set of joints. We're currently implementing the joint solver after getting promising results for our clustering algorithm to find the bones.

  Our final deliverable will be an animation-ready gaussian rig and a portable format for them. Clustering also massively downsizes the storage requirements because local rigidity means gaussians are predictive of their neighbors---no need to track all of them. We are also developing more visualizations to help understand the limitations of the representation present. In doing so, we have spotted some new failure modes of the original method, like how some regions gradually creep into neighboring regions over time. 
media: 
  - content: "grig.gif"
    alt_text: "..."
  - content: "grig2.gif"
    alt_text: "..."
links:
  # - url: ""
  #   text: "Github"
---