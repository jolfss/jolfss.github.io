(() => {
  // <stdin>
  var resizeContainers = () => {
    try {
      const containers = document.querySelectorAll(".rem-resize-container");
      if (containers.length === 0) {
        console.log("Resizable container script ran, but no elements with the class '.rem-resize-container' were found.");
        return;
      }
      const remInPixels = parseFloat(getComputedStyle(document.documentElement).fontSize);
      if (isNaN(remInPixels) || remInPixels <= 0) {
        console.error("Could not determine the pixel value of 1rem. Aborting script.");
        return;
      }
      containers.forEach((container, index) => {
        container.style.height = "auto";
        const contentHeight = container.scrollHeight;
        const stepHeight = 2 * remInPixels;
        const newHeightInPixels = Math.ceil(contentHeight / stepHeight) * stepHeight;
        container.style.height = `${newHeightInPixels}px`;
      });
    } catch (error) {
      console.error("An error occurred during the rem resize container script:", error);
    }
  };
  window.onload = resizeContainers;
  var resizeTimer;
  window.onresize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeContainers, 50);
  };
})();
