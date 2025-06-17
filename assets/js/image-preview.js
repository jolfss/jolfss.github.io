// Image preview functionality
document.addEventListener('DOMContentLoaded', function() {
    // Create preview container
    const previewContainer = document.createElement('div');
    previewContainer.className = 'image-preview-container';
    document.body.appendChild(previewContainer);

    // Add click event listeners to all images
    document.querySelectorAll('img').forEach(img => {
        img.addEventListener('click', function() {
            // Create preview elements
            const preview = document.createElement('div');
            preview.className = 'image-preview';
            
            const previewImage = document.createElement('img');
            previewImage.src = this.src;
            previewImage.className = 'preview-image';
            
            const altText = document.createElement('div');
            altText.className = 'preview-alt-text';
            altText.textContent = this.alt || 'No description available';
            
            // Add elements to preview
            preview.appendChild(previewImage);
            preview.appendChild(altText);
            
            // Clear and show preview container
            previewContainer.innerHTML = '';
            previewContainer.appendChild(preview);
            previewContainer.style.display = 'flex';
            
            // Add click event to close preview
            previewContainer.addEventListener('click', function() {
                previewContainer.style.display = 'none';
            });
        });
    });
}); 