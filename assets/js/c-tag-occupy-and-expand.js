/**
 * c-tag-occupy-and-expand.js
 *
 * Automatically applies grid-aligned widths to all .c-tag elements.
 * Each tag occupies an integer number of grid cells (2rem width) and
 * expands by exactly one cell on hover.
 *
 * This script runs on DOM ready and calculates element widths, rounding up to
 * the nearest multiple of 2rem. It also sets a hover width that is +2rem.
 *
 * NOTE: Inspired by rem-height-ceil.js
 */

// Cache the rem value to avoid repeated calculations
let remInPixels = null;

// Calculate and cache the rem value
const getRemInPixels = () => {
    if (remInPixels === null) {
        remInPixels = parseFloat(getComputedStyle(document.documentElement).fontSize);
        if (isNaN(remInPixels) || remInPixels <= 0) {
            console.error("Could not determine the pixel value of 1rem. Aborting c-tag script.");
            return null;
        }
    }
    return remInPixels;
};

// Resize a specific .c-tag element's width
const resizeCTag = (tag) => {
    try {
        const rem = getRemInPixels();
        if (rem === null) return;

        // Temporarily reset width to auto to measure the natural content width accurately.
        tag.style.width = 'auto';
        tag.style.minWidth = 'auto';

        // Get the total width of the content.
        const contentWidth = tag.scrollWidth;

        // Calculate the new width ceiled to the nearest multiple of (2 * 1rem).
        const stepWidth = 2 * rem;
        const ceiledWidth = Math.ceil(contentWidth / stepWidth) * stepWidth;

        const baseWidthInPixels = Math.max(stepWidth, ceiledWidth);
        const hoverWidthInPixels = baseWidthInPixels + stepWidth;

        // Apply the base width to the tag.
        tag.style.width = `${baseWidthInPixels}px`;
        tag.style.minWidth = `${baseWidthInPixels}px`;

        // Store hover width as a CSS custom property
        tag.style.setProperty('--hover-width', `${hoverWidthInPixels}px`);

    } catch (error) {
        console.error("An error occurred while resizing .c-tag width:", error);
    }
};

// Resize all .c-tag elements
const resizeAllCTags = () => {
    try {
        // Select all .c-tag elements
        const tags = document.querySelectorAll('.c-tag');

        if (tags.length === 0) {
            console.log("c-tag script ran, but no .c-tag elements were found.");
            return;
        }

        // Iterate over each tag and adjust its width.
        tags.forEach(resizeCTag);

    } catch (error) {
        console.error("An error occurred during the c-tag resize script:", error);
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', resizeAllCTags);

// Rerun on window resize (with debouncing)
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeAllCTags, 50);
});
