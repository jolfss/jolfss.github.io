/**
 * .rem-height-ceil-js
 *
 * Hybrid strategy:
 * - Preferred path: static min-height hints (`data-rem-static='true'`) injected at build time.
 * - Fallback path: runtime snapping to 2rem grid when content overflows (late images/MathJax/resize).
 */

let remInPixels = null;
let resizeTimer;

const getRemInPixels = () => {
    if (remInPixels === null) {
        remInPixels = parseFloat(getComputedStyle(document.documentElement).fontSize);
        if (isNaN(remInPixels) || remInPixels <= 0) {
            console.error("Could not determine the pixel value of 1rem. Aborting script.");
            return null;
        }
    }
    return remInPixels;
};

const snapHeight = (heightPx, remPx) => {
    const step = 2 * remPx;
    return Math.max(step, Math.ceil(heightPx / step) * step);
};

const hasStaticHint = (container) => container.getAttribute('data-rem-static') === 'true';

const resizeContainer = (container, { force = false } = {}) => {
    try {
        const rem = getRemInPixels();
        if (rem === null) return;

        const staticHinted = hasStaticHint(container);

        if (staticHinted && !force) {
            const isOverflowing = container.scrollHeight > container.clientHeight + 1;

            if (!isOverflowing) {
                if (container.style.height) {
                    container.style.height = '';
                }
                return;
            }

            const snappedOverflowHeight = snapHeight(container.scrollHeight, rem);
            const currentHeight = container.getBoundingClientRect().height;

            if (snappedOverflowHeight > currentHeight + 1) {
                container.style.height = `${snappedOverflowHeight}px`;
            }
            return;
        }

        container.style.height = 'auto';
        const measuredHeight = Math.max(container.offsetHeight, container.scrollHeight);
        const snappedHeight = snapHeight(measuredHeight, rem);
        container.style.height = `${snappedHeight}px`;
    } catch (error) {
        console.error("An error occurred while resizing container:", error);
    }
};

const resizeContainers = (options = {}) => {
    try {
        const containers = document.querySelectorAll('.rem-height-ceil-js');

        if (containers.length === 0) {
            return;
        }

        containers.forEach((container) => resizeContainer(container, options));
    } catch (error) {
        console.error("An error occurred during rem-height fallback resizing:", error);
    }
};

const scheduleResize = (delay = 50, options = {}) => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => resizeContainers(options), delay);
};

const attachImageLoadListeners = (container) => {
    const images = container.querySelectorAll('img');

    images.forEach((img) => {
        if (!img.complete) {
            img.addEventListener('load', () => resizeContainer(container), { once: true });
            img.addEventListener('error', () => resizeContainer(container), { once: true });
        }
    });
};

const initializeContainers = () => {
    const containers = document.querySelectorAll('.rem-height-ceil-js');

    containers.forEach((container) => {
        // For statically hinted containers, only run fallback if they overflow.
        resizeContainer(container);
        attachImageLoadListeners(container);
    });
};

const observeContentChanges = () => {
    const containers = document.querySelectorAll('.rem-height-ceil-js');

    const observer = new MutationObserver((mutations) => {
        const relevantMutations = mutations.filter((mutation) => {
            let node = mutation.target;
            while (node && node !== document) {
                if (node.classList && (
                    node.classList.contains('c-desmos-calculator') ||
                    node.classList.contains('c-desmos-calculator-3d') ||
                    node.classList.contains('desmos-graph')
                )) {
                    return false;
                }
                node = node.parentElement;
            }
            return true;
        });

        if (relevantMutations.length > 0) {
            scheduleResize();
        }
    });

    containers.forEach((container) => {
        observer.observe(container, {
            childList: true,
            subtree: true,
            characterData: true
        });
    });
};

const setupMathJaxHook = () => {
    if (typeof MathJax !== 'undefined' && MathJax.startup && MathJax.startup.promise) {
        MathJax.startup.promise
            .then(() => resizeContainers())
            .catch((error) => {
                console.error("MathJax initialization error:", error);
            });
    }
};

const setupFontLoadHooks = () => {
    if (!document.fonts) {
        return;
    }

    const handleFontEvent = () => scheduleResize(0);

    document.fonts.ready
        .then(handleFontEvent)
        .catch((error) => {
            console.error("Font loading error:", error);
        });

    if (typeof document.fonts.addEventListener === 'function') {
        document.fonts.addEventListener('loadingdone', handleFontEvent);
        document.fonts.addEventListener('loadingerror', handleFontEvent);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initializeContainers();
    observeContentChanges();
    setupMathJaxHook();
});

window.addEventListener('resize', () => {
    scheduleResize();
});

setupFontLoadHooks();
