---
featured: true
date: "2023-08-23"
title: "Let it SIMmer / Open-Vocabulary Traversability"
authors: 
  - name: "Sean Brynjólfsson"
  - name: "William Pinstrup Huey"
    url: "https://willhuey.com/"
description: |
  Generalizing to new and dynamic environments is a significant challenge in mobile robotics. Nowadays, vision-aware models are more prevalent and significantly powerful. These models are capable of producing robust, semantic features that make downstream tasks like navigation significantly easier. Images are rich enough to characterize many cues that geometric information alone does not provide.

  Three implementations comprise our overall method. In total, our system allows for streaming from a robot to a compute node which then answers classification requests from users in either Isaac Sim or Rviz.

      Voxvis: An extension for NVIDIA Omniverse's Isaac Sim to interface with the voxel segmentations; we also provide a similar accompanying Rviz visualization. Communication between the modules is implemented in ROS, making it suitable for both live, simulated, and replay data.
      OVT: An open-vocabulary traversability segmentation framework. This is a ros node that processes incoming RGB-D images and extracts embeddings for each pixel and then bundles it with odometry and pose data from the robot. (We don't collapse the embeddings into a classification yet, we let it SIMmer)
      Voxseg: A bridge between OVT and Voxvis, Voxseg simultaneously updates the internal voxelized embeddings and handles requests from Voxvis for a particular user-specified, open-vocabulary classification over them.

  We also implemented other helpful tools to generate environments in Omniverse, such as construction sites and forested scenes, (Isaac Stage GitHub). NOTE: This has not been updated to the latest major version of Isaac Sim/Orbit.
media: 
  - content: "ovt.png"
    alt_text: "..."
  - content: "ovt_seg.png"
    alt_text: "..."
  - content: "labels.png"
    alt_text: "..."
links:
  # - url: ""
  #   text: "Github"
---