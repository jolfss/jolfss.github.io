(() => {
  // <stdin>
  document.addEventListener("DOMContentLoaded", function() {
    const previewContainer = document.createElement("div");
    previewContainer.className = "image-preview-container";
    document.body.appendChild(previewContainer);
    document.querySelectorAll("img").forEach((img) => {
      img.addEventListener("click", function() {
        const preview = document.createElement("div");
        preview.className = "image-preview";
        const previewImage = document.createElement("img");
        previewImage.src = this.src;
        previewImage.className = "preview-image";
        const altText = document.createElement("div");
        altText.className = "preview-alt-text";
        altText.textContent = this.alt || "No description available";
        preview.appendChild(previewImage);
        preview.appendChild(altText);
        previewContainer.innerHTML = "";
        previewContainer.appendChild(preview);
        previewContainer.style.display = "flex";
        previewContainer.addEventListener("click", function() {
          previewContainer.style.display = "none";
        });
      });
    });
  });
})();
