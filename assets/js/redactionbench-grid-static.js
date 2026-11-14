(() => {
    const grid = document.querySelector('[data-complex-grid-static]');
    const layer = grid?.querySelector('.complex-grid__layer');
    if (!grid || !layer) return;

    let variants;
    try {
        variants = JSON.parse(grid.dataset.variants || '[]');
    } catch {
        return;
    }
    if (!variants.length) return;
    let activeAsset = '';
    function selectVariant() {
        const viewportWidth = window.innerWidth;
        const variant = variants.find((entry) => (
            viewportWidth >= entry.minWidth
            && (entry.maxWidth === null || viewportWidth < entry.maxWidth)
        )) || variants.reduce((nearest, entry) => (
            Math.abs(entry.renderWidth - viewportWidth) < Math.abs(nearest.renderWidth - viewportWidth)
                ? entry
                : nearest
        ));

        if (variant.asset === activeAsset) return;
        activeAsset = variant.asset;
        const image = `url("${variant.asset}")`;
        layer.style.width = `${variant.width}px`;
        layer.style.height = `${variant.height}px`;
        // The field SVG contains both lines and the subtle potential tint.
        // A CSS mask retains only alpha and silently discards the tint.
        layer.style.background = 'transparent';
        layer.style.backgroundImage = image;
        layer.style.backgroundRepeat = 'no-repeat';
        layer.style.backgroundSize = '100% 100%';
        layer.style.maskImage = 'none';
        layer.style.webkitMaskImage = 'none';
        grid.style.height = `${variant.height}px`;
    }

    selectVariant();
    window.addEventListener('resize', selectVariant, { passive: true });
})();
