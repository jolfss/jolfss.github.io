---
featured: true
date: "2022-10-15"
title: "Fractal Raytracer"
authors: 
  - name: "Sean Brynjólfsson"
  - name: "Jack Otto"
description: |
  This fractal raytracer was a creative assignment for Cornell's CS4620 graphics course. The premise was simply to take the raytracer we had just completed in a prior assignment and augment it with some new feature. We chose to try generating some constructive solid geometry fractals. The idea is quite simple; our scene is composed of two types of objects: spheres and reentrant spheres. Rays which hit spheres bounce as they would ordinarily for solid geometry, rays which hit a reentrant sphere descend recursively into copies of the scene. We also treat the reentrant spheres as subtractive of the solid spheres they intersect, so rays that leave a subscene won't end up inside solid geometry. If a ray passes through the subscene and doesn't hit either a solid or reentrant primitive, it decrements its recursive depth until it has popped off all the layers it has descended. 
media: 
  - content: "fractals.jpg"
    alt_text: "..."
  - content: "fractals2.png"
    alt_text: "..."
links:
  # - url: ""
  #   text: "Github"
---