/**
 * debug-grid.js
 *
 * Visualizes grid alignment issues for `.rem-height-ceil-js` panels when
 * running on localhost. Toggle with Ctrl+Shift+G or via `window.debugGrid`.
 */
(() => {
    const HOST_WHITELIST = new Set(['localhost', '127.0.0.1', '::1']);
    if (!HOST_WHITELIST.has(window.location.hostname)) {
        return;
    }

    const MARKER_SIZE = 10;
    const EPSILON = 0.25;
    const markers = [];
    let markersVisible = false;
    let gridOverlay = null;

    const rootStyles = getComputedStyle(document.documentElement);
    const remInPixels = parseFloat(rootStyles.fontSize) || 16;

    const parseLength = (value, fallbackMultiplier = 1) => {
        const trimmed = value.trim();
        if (!trimmed) {
            return fallbackMultiplier;
        }

        if (trimmed.endsWith('rem')) {
            return parseFloat(trimmed) * remInPixels;
        }

        if (trimmed.endsWith('px')) {
            return parseFloat(trimmed);
        }

        const numeric = parseFloat(trimmed);
        return Number.isFinite(numeric) ? numeric : fallbackMultiplier;
    };

    const gridSpacing = parseLength(
        rootStyles.getPropertyValue('--grid-spacing'),
        2 * remInPixels
    );
    const gridThickness = parseLength(
        rootStyles.getPropertyValue('--grid-thickness'),
        0.1 * remInPixels
    );

    const computeSignedOffset = (value, origin, spacing) => {
        const normalized = ((value - origin) % spacing + spacing) % spacing;
        return normalized <= spacing / 2 ? normalized : normalized - spacing;
    };

    const parseBackgroundPositions = (bgPositionValue) => {
        const parts = bgPositionValue.split(',').map(p => p.trim());
        return parts.map((part) => {
            const [xRaw = '0px', yRaw = '0px'] = part.split(/\s+/);
            const parsePx = (val) => {
                if (val.includes('%') || val.includes('calc')) {
                    return NaN;
                }
                const n = parseFloat(val);
                return Number.isFinite(n) ? n : NaN;
            };
            return { x: parsePx(xRaw), y: parsePx(yRaw) };
        });
    };

    let lastDebugInfo = null;

    const clearMarkers = () => {
        markers.splice(0).forEach(marker => marker.remove());
    };

    const addMarker = ({ x, y, dx, dy }) => {
        const marker = document.createElement('span');
        marker.className = 'debug-grid-marker';
        const alignedX = Math.abs(dx) <= EPSILON;
        const alignedY = Math.abs(dy) <= EPSILON;
        const aligned = alignedX && alignedY;
        marker.title = `x-offset: ${dx.toFixed(2)}px, y-offset: ${dy.toFixed(2)}px`;
        Object.assign(marker.style, {
            position: 'absolute',
            width: `${MARKER_SIZE}px`,
            height: `${MARKER_SIZE}px`,
            left: `${x}px`,
            top: `${y}px`,
            transform: 'translate(-50%, -50%)',
            borderRadius: '4px',
            border: aligned ? '1px solid rgba(0, 150, 0, 0.6)' : '1px solid rgba(200, 0, 0, 0.5)',
            background: 'rgba(255, 255, 255, 0.05)',
            zIndex: 10001,
            pointerEvents: 'none',
            backdropFilter: 'blur(2px)'
        });

        const addAxisIndicator = (axis, offset, isAligned) => {
            const indicator = document.createElement('span');
            indicator.dataset.axis = axis;
            indicator.dataset.offset = offset.toFixed(2);
            indicator.style.position = 'absolute';
            indicator.style.background = isAligned ? 'rgba(0, 150, 0, 0.9)' : 'rgba(200, 0, 0, 0.9)';

            if (axis === 'x') {
                indicator.style.width = '100%';
                indicator.style.height = '2px';
                indicator.style.left = '0';
                indicator.style.top = '50%';
                indicator.style.transform = 'translateY(-50%)';
            } else {
                indicator.style.width = '2px';
                indicator.style.height = '100%';
                indicator.style.top = '0';
                indicator.style.left = '50%';
                indicator.style.transform = 'translateX(-50%)';
            }

            marker.appendChild(indicator);
        };

        addAxisIndicator('x', dx, alignedX);
        addAxisIndicator('y', dy, alignedY);

        // Render numeric deltas so you can see the exact error even when bars look aligned
        const label = document.createElement('span');
        label.textContent = `${dx.toFixed(2)}, ${dy.toFixed(2)} px`;
        Object.assign(label.style, {
            position: 'absolute',
            top: '0',
            left: '50%',
            transform: 'translate(-50%, -140%)',
            padding: '2px 4px',
            fontSize: '10px',
            fontFamily: 'monospace',
            background: aligned ? 'rgba(0, 150, 0, 0.85)' : 'rgba(200, 0, 0, 0.85)',
            color: 'white',
            borderRadius: '3px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 10002
        });
        marker.appendChild(label);

        document.body.appendChild(marker);
        markers.push(marker);
    };

    const measureAndMark = () => {
        clearMarkers();

        const body = document.body;
        const bodyRect = body.getBoundingClientRect();
        const bodyStyle = getComputedStyle(body);
        const paddingLeft = parseLength(bodyStyle.paddingLeft, 0);
        const paddingRight = parseLength(bodyStyle.paddingRight, 0);
        const paddingTop = parseLength(bodyStyle.paddingTop, 0);
        const paddingBottom = parseLength(bodyStyle.paddingBottom, 0);

        const contentWidth = bodyRect.width - paddingLeft - paddingRight;
        const contentHeight = bodyRect.height - paddingTop - paddingBottom;

        // Compute grid intersections in the body padding-box coordinate space:
        // - Vertical lines: center of the body box.
        // - Horizontal lines: top edge of the body box.
        const originXLocal = (contentWidth / 2) - (gridSpacing / 2);
        const originYLocal = 0;

        const referenceLeft = bodyRect.left + paddingLeft;
        const referenceTop = bodyRect.top + paddingTop;

        // Render a dot grid at the exact intersections for visual verification
        if (!gridOverlay) {
            gridOverlay = document.createElement('div');
            gridOverlay.className = 'debug-grid-midpoints';
            document.body.appendChild(gridOverlay);
        }

        const pageWidth = Math.max(
            document.documentElement.scrollWidth,
            document.documentElement.clientWidth
        );
        const pageHeight = Math.max(
            document.documentElement.scrollHeight,
            document.documentElement.clientHeight
        );

        const overlayLeft = 0;
        const overlayTop = 0;

        // Convert the grid origin (relative to padding box) into page coordinates.
        // The CSS grid's vertical lines are phase-shifted by half the spacing, so we offset
        // the overlay by gridSpacing / 2 while keeping the measurement origin unchanged.
        const originXPage = referenceLeft + originXLocal + window.scrollX + (gridSpacing / 2);
        // Apply the 1rem upward correction only to the overlay dots; corner math uses originYLocal = 0
        const originYPage = referenceTop + originYLocal + window.scrollY - remInPixels;

        Object.assign(gridOverlay.style, {
            position: 'absolute',
            pointerEvents: 'none',
            left: `${overlayLeft}px`,
            top: `${overlayTop}px`,
            width: `${pageWidth}px`,
            height: `${pageHeight}px`,
            backgroundImage: 'radial-gradient(circle, rgba(50, 150, 255, 0.8) 2px, transparent 2px)',
            backgroundSize: `${gridSpacing}px ${gridSpacing}px`,
            backgroundPosition: `${originXPage}px ${originYPage}px`,
            zIndex: 9998
        });

        lastDebugInfo = {
            gridSpacing,
            gridThickness,
            originX: originXLocal,
            originY: originYLocal,
            overlayLeft,
            overlayTop,
            bodyLeft: bodyRect.left,
            bodyTop: bodyRect.top,
            timestamp: performance.now()
        };

        document.querySelectorAll('.rem-height-ceil-js').forEach((el) => {
            const rect = el.getBoundingClientRect();

            ['left', 'right'].forEach((horizontalSide) => {
                ['top', 'bottom'].forEach((verticalSide) => {
                    const cornerX = rect[horizontalSide] - referenceLeft;
                    const cornerY = rect[verticalSide] - referenceTop;

                    const dx = computeSignedOffset(cornerX, originXLocal, gridSpacing);
                    const dy = computeSignedOffset(cornerY, originYLocal, gridSpacing);

                    addMarker({
                        x: rect[horizontalSide] + window.scrollX,
                        y: rect[verticalSide] + window.scrollY,
                        dx,
                        dy
                    });
                });
            });
        });
    };

    const showMarkers = () => {
        if (markersVisible) return;
        markersVisible = true;
        sessionStorage.setItem('debug-grid-visible', '1');
        measureAndMark();
        window.addEventListener('resize', measureAndMark);
    };

    const hideMarkers = () => {
        if (!markersVisible) return;
        markersVisible = false;
        sessionStorage.removeItem('debug-grid-visible');
        window.removeEventListener('resize', measureAndMark);
        clearMarkers();
        if (gridOverlay) {
            gridOverlay.remove();
            gridOverlay = null;
        }
    };

    const toggleMarkers = () => {
        if (markersVisible) {
            hideMarkers();
        } else {
            showMarkers();
        }
    };

    window.debugGrid = {
        show: showMarkers,
        hide: hideMarkers,
        toggle: toggleMarkers,
        refresh: measureAndMark,
        debugInfo: () => lastDebugInfo
    };

    document.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === 'g' && event.ctrlKey && event.shiftKey) {
            event.preventDefault();
            toggleMarkers();
        }
    });

    if (sessionStorage.getItem('debug-grid-visible') === '1') {
        showMarkers();
    }

    window.addEventListener('scroll', () => {
        if (markersVisible) {
            measureAndMark();
        }
    }, { passive: true });
})();
