(() => {
    const canvas = document.querySelector('[data-complex-grid]');
    if (!canvas) return;

    const root = document.documentElement;
    const exportMode = new URLSearchParams(window.location.search).has('field-export');
    let context = canvas.getContext('2d');
    let animationFrame = 0;

    function createSvgContext() {
        const paths = [];
        const rectangles = [];
        let segments = [];
        let roundedRectangles = [];
        let cursor = null;

        const keyForPoint = (point) => `${Math.round(point.x * 100)},${Math.round(point.y * 100)}`;
        const number = (value) => Number(value.toFixed(2));

        function simplify(points, tolerance = 0.12) {
            if (points.length <= 2) return points;
            const first = points[0];
            const last = points[points.length - 1];
            const dx = last.x - first.x;
            const dy = last.y - first.y;
            const lengthSquared = dx * dx + dy * dy;
            let farthestIndex = 0;
            let farthestDistanceSquared = 0;

            for (let index = 1; index < points.length - 1; index += 1) {
                const point = points[index];
                let distanceSquared;
                if (lengthSquared < 1e-12) {
                    distanceSquared = (point.x - first.x) ** 2 + (point.y - first.y) ** 2;
                } else {
                    const t = Math.max(0, Math.min(1, ((point.x - first.x) * dx + (point.y - first.y) * dy) / lengthSquared));
                    const projectedX = first.x + t * dx;
                    const projectedY = first.y + t * dy;
                    distanceSquared = (point.x - projectedX) ** 2 + (point.y - projectedY) ** 2;
                }
                if (distanceSquared > farthestDistanceSquared) {
                    farthestDistanceSquared = distanceSquared;
                    farthestIndex = index;
                }
            }

            if (farthestDistanceSquared <= tolerance * tolerance) return [first, last];
            const left = simplify(points.slice(0, farthestIndex + 1), tolerance);
            const right = simplify(points.slice(farthestIndex), tolerance);
            return [...left.slice(0, -1), ...right];
        }

        function joinedPolylines(sourceSegments) {
            const adjacency = new Map();
            sourceSegments.forEach((segment, index) => {
                for (let endpoint = 0; endpoint < 2; endpoint += 1) {
                    const key = keyForPoint(segment[endpoint]);
                    if (!adjacency.has(key)) adjacency.set(key, []);
                    adjacency.get(key).push({ endpoint, index });
                }
            });

            const visited = new Uint8Array(sourceSegments.length);
            const polylines = [];
            const nextSegment = (point) => (
                adjacency.get(keyForPoint(point))?.find((entry) => !visited[entry.index])
            );

            function extend(points, prepend) {
                while (true) {
                    const point = prepend ? points[0] : points[points.length - 1];
                    const next = nextSegment(point);
                    if (!next) return;
                    visited[next.index] = 1;
                    const segment = sourceSegments[next.index];
                    const other = segment[next.endpoint === 0 ? 1 : 0];
                    if (prepend) points.unshift(other);
                    else points.push(other);
                }
            }

            const orderedIndices = sourceSegments.map((_, index) => index).sort((first, second) => {
                const firstOpen = adjacency.get(keyForPoint(sourceSegments[first][0])).length !== 2;
                const secondOpen = adjacency.get(keyForPoint(sourceSegments[second][0])).length !== 2;
                return Number(secondOpen) - Number(firstOpen);
            });
            for (const index of orderedIndices) {
                if (visited[index]) continue;
                visited[index] = 1;
                const points = [...sourceSegments[index]];
                extend(points, false);
                extend(points, true);
                polylines.push(simplify(points));
            }
            return polylines;
        }

        return {
            beginPath() {
                segments = [];
                roundedRectangles = [];
                cursor = null;
            },
            clearRect() {
                paths.length = 0;
                rectangles.length = 0;
            },
            lineTo(x, y) {
                const point = { x, y };
                if (cursor) segments.push([cursor, point]);
                cursor = point;
            },
            moveTo(x, y) {
                cursor = { x, y };
            },
            roundRect(x, y, width, height, radius) {
                roundedRectangles.push({ height, radius, width, x, y });
            },
            setTransform() {},
            stroke() {
                if (segments.length) {
                    const data = joinedPolylines(segments).map((points) => (
                        points.map((point, index) => `${index === 0 ? 'M' : 'L'}${number(point.x)} ${number(point.y)}`).join('')
                    )).join('');
                    if (data) paths.push(data);
                }
                rectangles.push(...roundedRectangles);
            },
            toSvg(width, height) {
                const pathMarkup = paths.map((data) => `<path d="${data}"/>`).join('');
                const rectangleMarkup = rectangles.map((rectangle) => (
                    `<rect x="${number(rectangle.x)}" y="${number(rectangle.y)}" width="${number(rectangle.width)}" height="${number(rectangle.height)}" rx="${number(rectangle.radius)}"/>`
                )).join('');
                return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" stroke="#000" stroke-width="1">${pathMarkup}${rectangleMarkup}</svg>`;
            }
        };
    }

    function scheduleDraw() {
        cancelAnimationFrame(animationFrame);
        animationFrame = requestAnimationFrame(draw);
    }

    function getPageRect(element) {
        const rect = element.getBoundingClientRect();
        return {
            bottom: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
            right: rect.right + window.scrollX,
            top: rect.top + window.scrollY
        };
    }

    function regionContains(outer, inner) {
        return inner.left >= outer.left
            && inner.right <= outer.right
            && inner.top >= outer.top
            && inner.bottom <= outer.bottom;
    }

    function getRegions() {
        const elements = document.querySelectorAll('.pane, .site-mark, .site-nav a, .theme-toggle, .button, pre, .table-scroll, .paper-figure-frame, .sidenote__content, .rb-sample-tabs button, .rb-doc, .rb-doc-frame, .rb-score-summary');
        const regions = Array.from(elements, (element) => {
            const rect = getPageRect(element);
            const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0;
            return {
                ...rect,
                isButton: element.matches('.site-mark, .site-nav a, .theme-toggle, .button, .rb-sample-tabs button'),
                radius: Math.min(radius, (rect.right - rect.left) / 2, (rect.bottom - rect.top) / 2)
            };
        }).filter((region) => region.right > region.left && region.bottom > region.top);

        return regions.filter((region, index) => !regions.some((other, otherIndex) => (
            otherIndex !== index && regionContains(other, region)
        )));
    }

    function roundedRectDistance(x, y, region) {
        const centerX = (region.left + region.right) / 2;
        const centerY = (region.top + region.bottom) / 2;
        const halfWidth = (region.right - region.left) / 2;
        const halfHeight = (region.bottom - region.top) / 2;
        const qx = Math.abs(x - centerX) - (halfWidth - region.radius);
        const qy = Math.abs(y - centerY) - (halfHeight - region.radius);
        return Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
            + Math.min(Math.max(qx, qy), 0)
            - region.radius;
    }

    function containingRegionIndex(x, y, regions) {
        return regions.findIndex((region) => roundedRectDistance(x, y, region) < 0);
    }

    function boundaryIntersection(outsidePoint, insidePoint, region) {
        let outside = { ...outsidePoint };
        let inside = { ...insidePoint };
        for (let iteration = 0; iteration < 14; iteration += 1) {
            const middle = { x: (outside.x + inside.x) / 2, y: (outside.y + inside.y) / 2 };
            if (roundedRectDistance(middle.x, middle.y, region) < 0) inside = middle;
            else outside = middle;
        }
        return { x: (outside.x + inside.x) / 2, y: (outside.y + inside.y) / 2 };
    }

    function solveLinearSystem(matrix, rightHandSide) {
        const size = rightHandSide.length;
        for (let column = 0; column < size; column += 1) {
            let pivotRow = column;
            let pivotMagnitude = Math.abs(matrix[column][column]);
            for (let row = column + 1; row < size; row += 1) {
                const magnitude = Math.abs(matrix[row][column]);
                if (magnitude > pivotMagnitude) {
                    pivotMagnitude = magnitude;
                    pivotRow = row;
                }
            }
            if (pivotMagnitude < 1e-10) throw new Error('Degenerate conductor system');
            if (pivotRow !== column) {
                [matrix[column], matrix[pivotRow]] = [matrix[pivotRow], matrix[column]];
                [rightHandSide[column], rightHandSide[pivotRow]] = [rightHandSide[pivotRow], rightHandSide[column]];
            }

            const pivot = matrix[column][column];
            for (let row = column + 1; row < size; row += 1) {
                const factor = matrix[row][column] / pivot;
                if (Math.abs(factor) < 1e-14) continue;
                matrix[row][column] = 0;
                for (let inner = column + 1; inner < size; inner += 1) {
                    matrix[row][inner] -= factor * matrix[column][inner];
                }
                rightHandSide[row] -= factor * rightHandSide[column];
            }
        }

        const solution = new Float64Array(size);
        for (let row = size - 1; row >= 0; row -= 1) {
            let value = rightHandSide[row];
            for (let column = row + 1; column < size; column += 1) {
                value -= matrix[row][column] * solution[column];
            }
            solution[row] = value / matrix[row][row];
        }
        return solution;
    }

    function segmentKernel(x, y, source, referenceLength) {
        const tangentX = -source.normalY;
        const tangentY = source.normalX;
        const offset = source.ds / (2 * Math.sqrt(3));
        const firstDistance = Math.max(
            Math.hypot(x - source.x - tangentX * offset, y - source.y - tangentY * offset),
            source.ds * 0.06
        );
        const secondDistance = Math.max(
            Math.hypot(x - source.x + tangentX * offset, y - source.y + tangentY * offset),
            source.ds * 0.06
        );
        return -(Math.log(firstDistance / referenceLength) + Math.log(secondDistance / referenceLength)) / (4 * Math.PI);
    }

    function segmentStreamKernel(x, y, source, reference) {
        const tangentX = -source.normalY;
        const tangentY = source.normalX;
        const offset = source.ds / (2 * Math.sqrt(3));
        const relativeAngle = (sourceX, sourceY) => {
            const ax = x - sourceX;
            const ay = y - sourceY;
            const bx = x - reference.x;
            const by = y - reference.y;
            return Math.atan2(ay * bx - ax * by, ax * bx + ay * by);
        };
        const firstAngle = relativeAngle(source.x + tangentX * offset, source.y + tangentY * offset);
        const secondAngle = relativeAngle(source.x - tangentX * offset, source.y - tangentY * offset);
        return -(firstAngle + secondAngle) / (4 * Math.PI);
    }

    function solveFloatingConductors(regions, grid, height) {
        const samples = [];
        const sampleSpacing = Math.max(8, grid * 0.75);
        regions.forEach((region, regionIndex) => {
            for (const sample of roundedBoundarySamples(region, sampleSpacing)) {
                samples.push({ ...sample, regionIndex });
            }
        });

        const sampleCount = samples.length;
        const size = sampleCount + regions.length;
        const matrix = Array.from({ length: size }, () => new Float64Array(size));
        const rightHandSide = new Float64Array(size);
        const referenceLength = Math.max(height, 1);

        for (let row = 0; row < sampleCount; row += 1) {
            const observation = samples[row];
            for (let column = 0; column < sampleCount; column += 1) {
                const source = samples[column];
                matrix[row][column] = row === column
                    ? -Math.log(Math.max(source.ds / (2 * Math.E), 0.25) / referenceLength) / (2 * Math.PI)
                    : segmentKernel(observation.x, observation.y, source, referenceLength);
            }
            matrix[row][sampleCount + observation.regionIndex] = -1;
            rightHandSide[row] = -(observation.y - height / 2);
        }

        for (let regionIndex = 0; regionIndex < regions.length; regionIndex += 1) {
            const row = sampleCount + regionIndex;
            for (let column = 0; column < sampleCount; column += 1) {
                if (samples[column].regionIndex === regionIndex) matrix[row][column] = 1;
            }
        }

        const solution = solveLinearSystem(matrix, rightHandSide);
        samples.forEach((sample, index) => { sample.charge = solution[index]; });
        return {
            conductorPotentials: Array.from({ length: regions.length }, (_, index) => solution[sampleCount + index]),
            references: regions.map((region) => ({
                x: (region.left + region.right) / 2,
                y: (region.top + region.bottom) / 2
            })),
            referenceLength,
            samples
        };
    }

    function buildAxisCoordinates(length, spacing, regions, axis) {
        const coordinates = [];
        const fineSpacing = Math.max(1.5, spacing / 3);
        const refinementMargin = spacing * 2;
        const addRange = (start, end, step) => {
            const boundedStart = Math.max(0, start);
            const boundedEnd = Math.min(length, end);
            for (let value = boundedStart; value < boundedEnd; value += step) coordinates.push(value);
            coordinates.push(boundedEnd);
        };

        addRange(0, length, spacing);
        for (const region of regions) {
            const start = axis === 'x' ? region.left : region.top;
            const end = axis === 'x' ? region.right : region.bottom;
            const radius = region.radius;
            addRange(start - refinementMargin, start + radius + refinementMargin, fineSpacing);
            addRange(end - radius - refinementMargin, end + refinementMargin, fineSpacing);
        }

        coordinates.sort((first, second) => first - second);
        return coordinates.filter((coordinate, index) => (
            index === 0 || coordinate - coordinates[index - 1] > 1e-6
        ));
    }

    function buildMesh(width, height, regions, conductorSolution, grid) {
        const spacing = Math.max(4, grid / 4);
        const xCoordinates = buildAxisCoordinates(width, spacing, regions, 'x');
        const yCoordinates = buildAxisCoordinates(height, spacing, regions, 'y');
        const columns = xCoordinates.length;
        const rows = yCoordinates.length;
        const streamValues = new Float64Array(columns * rows);
        const values = new Float64Array(columns * rows);
        const { conductorPotentials, references, referenceLength, samples } = conductorSolution;
        let minimum = Infinity;
        let maximum = -Infinity;
        let streamMinimum = Infinity;
        let streamMaximum = -Infinity;

        for (let row = 0; row < rows; row += 1) {
            const y = yCoordinates[row];
            for (let column = 0; column < columns; column += 1) {
                const x = xCoordinates[column];
                const index = row * columns + column;
                const containingRegion = containingRegionIndex(x, y, regions);
                let potential = containingRegion >= 0 ? conductorPotentials[containingRegion] : y - height / 2;
                let stream = -x;
                for (const sample of samples) {
                    if (containingRegion < 0) {
                        potential += sample.charge * segmentKernel(x, y, sample, referenceLength);
                    }
                    stream += sample.charge * segmentStreamKernel(x, y, sample, references[sample.regionIndex]);
                }
                values[index] = potential;
                streamValues[index] = stream;
                minimum = Math.min(minimum, potential);
                maximum = Math.max(maximum, potential);
                if (containingRegion < 0) {
                    streamMinimum = Math.min(streamMinimum, stream);
                    streamMaximum = Math.max(streamMaximum, stream);
                }
            }
        }
        return {
            columns,
            height,
            maximum,
            minimum,
            rows,
            spacing,
            streamMaximum,
            streamMinimum,
            streamValues,
            values,
            width,
            xCoordinates,
            yCoordinates
        };
    }

    function edgePoint(level, firstValue, secondValue, firstX, firstY, secondX, secondY) {
        const difference = secondValue - firstValue;
        const t = Math.abs(difference) < 1e-9 ? 0.5 : (level - firstValue) / difference;
        return {
            x: firstX + (secondX - firstX) * t,
            y: firstY + (secondY - firstY) * t
        };
    }

    function clippedSegment(first, second, regions) {
        const firstRegion = containingRegionIndex(first.x, first.y, regions);
        const secondRegion = containingRegionIndex(second.x, second.y, regions);
        if (firstRegion >= 0 && secondRegion >= 0) return null;
        let start = first;
        let end = second;
        if (firstRegion >= 0) start = boundaryIntersection(second, first, regions[firstRegion]);
        if (secondRegion >= 0) end = boundaryIntersection(first, second, regions[secondRegion]);
        const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
        if (containingRegionIndex(midpoint.x, midpoint.y, regions) >= 0) return null;
        return [start, end];
    }

    function drawClippedSegment(first, second, regions) {
        const segment = clippedSegment(first, second, regions);
        if (!segment) return;
        const [start, end] = segment;
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
    }

    function drawContourSegments(segments, candidates, mesh) {
        if (!segments.length) return;
        const keyForPoint = (point) => `${Math.round(point.x * 100)},${Math.round(point.y * 100)}`;
        const adjacency = new Map();
        segments.forEach((segment, index) => {
            for (const point of segment) {
                const key = keyForPoint(point);
                if (!adjacency.has(key)) adjacency.set(key, []);
                adjacency.get(key).push(index);
            }
        });

        const visited = new Uint8Array(segments.length);
        const boundaryTolerance = Math.max(0.1, mesh.spacing * 0.05);
        for (let seed = 0; seed < segments.length; seed += 1) {
            if (visited[seed]) continue;
            const stack = [seed];
            const component = [];
            visited[seed] = 1;
            while (stack.length) {
                const index = stack.pop();
                component.push(index);
                for (const point of segments[index]) {
                    for (const neighbor of adjacency.get(keyForPoint(point)) || []) {
                        if (visited[neighbor]) continue;
                        visited[neighbor] = 1;
                        stack.push(neighbor);
                    }
                }
            }

            const points = component.flatMap((index) => segments[index]);
            const touchesPageBoundary = points.some((point) => (
                point.x <= boundaryTolerance
                || point.x >= mesh.width - boundaryTolerance
                || point.y <= boundaryTolerance
                || point.y >= mesh.height - boundaryTolerance
            ));
            const touchedConductors = new Set();
            candidates.forEach((candidate, index) => {
                if (points.some((point) => (
                    Math.abs(roundedRectDistance(point.x, point.y, candidate.region)) <= boundaryTolerance
                ))) touchedConductors.add(index);
            });

            // A component that terminates twice on one conductor is the
            // numerical boundary pill. Valid snapped contours either escape to
            // the page boundary, connect distinct conductors, or touch none.
            if (!touchesPageBoundary && touchedConductors.size === 1) continue;
            for (const index of component) {
                const [start, end] = segments[index];
                context.moveTo(start.x, start.y);
                context.lineTo(end.x, end.y);
            }
        }
    }

    function drawInterpolatedContour(mesh, regions, values, candidates, regularLevel, targetAtX) {
        const { columns, rows, xCoordinates, yCoordinates } = mesh;
        const centerY = (candidate) => (candidate.region.top + candidate.region.bottom) / 2;
        const intervals = [
            {
                start: 0,
                end: candidates[0].region.left,
                endCandidate: candidates[0],
                seed: () => centerY(candidates[0])
            },
            ...candidates.slice(1).map((candidate, index) => {
                const previous = candidates[index];
                return {
                    start: previous.region.right,
                    end: candidate.region.left,
                    startCandidate: previous,
                    endCandidate: candidate,
                    seed: (x) => {
                        const t = Math.max(0, Math.min(1, (
                            (x - previous.region.right)
                            / Math.max(candidate.region.left - previous.region.right, 1e-9)
                        )));
                        return centerY(previous) + (centerY(candidate) - centerY(previous)) * t;
                    }
                };
            }),
            {
                start: candidates[candidates.length - 1].region.right,
                end: mesh.width,
                startCandidate: candidates[candidates.length - 1],
                seed: () => centerY(candidates[candidates.length - 1])
            }
        ].filter((interval) => interval.end >= interval.start);

        const hermite = (first, second, firstSlope, secondSlope) => {
            const points = [];
            const dx = second.x - first.x;
            const steps = Math.max(4, Math.ceil(Math.abs(dx) / Math.max(mesh.spacing / 3, 1)));
            for (let step = 0; step <= steps; step += 1) {
                const t = step / steps;
                const t2 = t * t;
                const t3 = t2 * t;
                points.push({
                    x: first.x + dx * t,
                    y: (2 * t3 - 3 * t2 + 1) * first.y
                        + (t3 - 2 * t2 + t) * dx * firstSlope
                        + (-2 * t3 + 3 * t2) * second.y
                        + (t3 - t2) * dx * secondSlope
                });
            }
            return points;
        };

        const regularizeStart = (points, interval) => {
            if (!interval.startCandidate || points.length < 3) return points;
            const stableIndex = points.findIndex((point) => point.x - interval.start >= mesh.spacing * 2);
            if (stableIndex < 1 || stableIndex >= points.length - 1) return points;
            const stable = points[stableIndex];
            const next = points[stableIndex + 1];
            const stableSlope = (next.y - stable.y) / Math.max(next.x - stable.x, 1e-9);
            const boundary = { x: interval.start, y: centerY(interval.startCandidate) };
            return [...hermite(boundary, stable, 0, stableSlope), ...points.slice(stableIndex + 1)];
        };

        const regularizeEnd = (points, interval) => {
            if (!interval.endCandidate || points.length < 3) return points;
            let stableIndex = -1;
            for (let index = points.length - 1; index >= 0; index -= 1) {
                if (interval.end - points[index].x >= mesh.spacing * 2) {
                    stableIndex = index;
                    break;
                }
            }
            if (stableIndex <= 0 || stableIndex >= points.length - 1) return points;
            const previous = points[stableIndex - 1];
            const stable = points[stableIndex];
            const stableSlope = (stable.y - previous.y) / Math.max(stable.x - previous.x, 1e-9);
            const boundary = { x: interval.end, y: centerY(interval.endCandidate) };
            return [...points.slice(0, stableIndex), ...hermite(stable, boundary, stableSlope, 0)];
        };

        for (const interval of intervals) {
            let beforePreviousPoint = null;
            let previousPoint = null;
            let previousWasVisible = false;
            let current = [];
            const polylines = [];
            for (let column = 0; column < columns; column += 1) {
                const x = xCoordinates[column];
                if (x < interval.start - 1e-6 || x > interval.end + 1e-6) continue;
                const target = targetAtX(x, regularLevel, candidates);
                const roots = [];
                for (let row = 0; row < rows - 1; row += 1) {
                    const index = row * columns + column;
                    const first = values[index] - target;
                    const second = values[index + columns] - target;
                    if ((first < 0) === (second < 0) && Math.abs(first) > 1e-9 && Math.abs(second) > 1e-9) continue;
                    const point = edgePoint(0, first, second, x, yCoordinates[row], x, yCoordinates[row + 1]);
                    if (containingRegionIndex(point.x, point.y, regions) < 0) roots.push(point);
                }
                if (!roots.length) {
                    if (current.length > 1) polylines.push(current);
                    current = [];
                    previousWasVisible = false;
                    continue;
                }
                let desiredY = previousPoint?.y ?? interval.seed(x);
                if (beforePreviousPoint && previousPoint) {
                    const previousDx = previousPoint.x - beforePreviousPoint.x;
                    if (Math.abs(previousDx) > 1e-9) {
                        desiredY = previousPoint.y
                            + (previousPoint.y - beforePreviousPoint.y)
                            * (x - previousPoint.x) / previousDx;
                    }
                }
                const point = roots.reduce((closest, root) => (
                    Math.abs(root.y - desiredY) < Math.abs(closest.y - desiredY) ? root : closest
                ));
                if (!previousWasVisible) current = [point];
                else current.push(point);
                beforePreviousPoint = previousPoint;
                previousPoint = point;
                previousWasVisible = true;
            }
            if (current.length > 1) polylines.push(current);
            if (polylines.length) {
                polylines[0] = regularizeStart(polylines[0], interval);
                const last = polylines.length - 1;
                polylines[last] = regularizeEnd(polylines[last], interval);
            }
            for (const points of polylines) {
                for (let index = 1; index < points.length; index += 1) {
                    drawClippedSegment(points[index - 1], points[index], regions);
                }
            }
        }
    }

    function drawContourFamily(mesh, regions, values, minimum, maximum, interval, snapValues = []) {
        const { columns, rows, xCoordinates, yCoordinates } = mesh;
        const firstLevel = Math.floor(minimum / interval) * interval;
        const lastLevel = Math.ceil(maximum / interval) * interval;

        const targetAtX = (x, regularLevel, candidates) => {
            if (!candidates.length) return regularLevel;
            const first = candidates[0];
            if (x <= first.region.right) return first.potential;

            for (let index = 0; index < candidates.length - 1; index += 1) {
                const current = candidates[index];
                const next = candidates[index + 1];
                if (x < next.region.left) {
                    const t = Math.max(0, Math.min(1, (
                        (x - current.region.right) / Math.max(next.region.left - current.region.right, 1e-9)
                    )));
                    return current.potential + (next.potential - current.potential) * t;
                }
                if (x <= next.region.right) return next.potential;
            }
            return candidates[candidates.length - 1].potential;
        };

        const traceConstantLevel = (regularLevel) => {
            const segments = [];
            const drawSegment = (first, second) => {
                const segment = clippedSegment(first, second, regions);
                if (segment) segments.push(segment);
            };
            for (let row = 0; row < rows - 1; row += 1) {
                for (let column = 0; column < columns - 1; column += 1) {
                    const index = row * columns + column;
                    const x = xCoordinates[column];
                    const nextX = xCoordinates[column + 1];
                    const y = yCoordinates[row];
                    const nextY = yCoordinates[row + 1];
                    const topLeft = values[index] - regularLevel;
                    const topRight = values[index + 1] - regularLevel;
                    const bottomRight = values[index + columns + 1] - regularLevel;
                    const bottomLeft = values[index + columns] - regularLevel;
                    const points = [];

                    if ((topLeft < 0) !== (topRight < 0)) points.push(edgePoint(0, topLeft, topRight, x, y, nextX, y));
                    if ((topRight < 0) !== (bottomRight < 0)) points.push(edgePoint(0, topRight, bottomRight, nextX, y, nextX, nextY));
                    if ((bottomLeft < 0) !== (bottomRight < 0)) points.push(edgePoint(0, bottomLeft, bottomRight, x, nextY, nextX, nextY));
                    if ((topLeft < 0) !== (bottomLeft < 0)) points.push(edgePoint(0, topLeft, bottomLeft, x, y, x, nextY));

                    if (points.length === 2) {
                        drawSegment(points[0], points[1]);
                    } else if (points.length === 4) {
                        const centerHigh = (topLeft + topRight + bottomRight + bottomLeft) * 0.25 > 0;
                        const pairs = centerHigh ? [[0, 3], [1, 2]] : [[0, 1], [2, 3]];
                        for (const [first, second] of pairs) drawSegment(points[first], points[second]);
                    }
                }
            }
            return segments;
        };

        const contours = [];
        for (let level = firstLevel; level <= lastLevel; level += interval) {
            contours.push({ candidates: [], level, segments: traceConstantLevel(level) });
        }

        snapValues.forEach((potential, regionIndex) => {
            const region = regions[regionIndex];
            let bestContour = null;
            let bestDistance = Infinity;
            let bestPotentialDifference = Infinity;
            for (const contour of contours) {
                let distance = Infinity;
                for (const [start, end] of contour.segments) {
                    const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
                    distance = Math.min(
                        distance,
                        Math.abs(roundedRectDistance(start.x, start.y, region)),
                        Math.abs(roundedRectDistance(midpoint.x, midpoint.y, region)),
                        Math.abs(roundedRectDistance(end.x, end.y, region))
                    );
                }
                const potentialDifference = Math.abs(contour.level - potential);
                if (distance < bestDistance - 1e-6
                    || (Math.abs(distance - bestDistance) <= 1e-6
                        && potentialDifference < bestPotentialDifference)) {
                    bestContour = contour;
                    bestDistance = distance;
                    bestPotentialDifference = potentialDifference;
                }
            }
            bestContour?.candidates.push({ potential, region, regionIndex });
        });

        for (const contour of contours) {
            const candidates = contour.candidates.sort((first, second) => (
                first.region.left - second.region.left
            ));
            context.beginPath();
            if (candidates.length) {
                drawInterpolatedContour(mesh, regions, values, candidates, contour.level, targetAtX);
            } else {
                drawContourSegments(contour.segments, [], mesh);
            }
            context.stroke();
        }
    }

    function drawEquipotentials(mesh, regions, grid, conductorPotentials) {
        drawContourFamily(mesh, regions, mesh.values, mesh.minimum, mesh.maximum, grid * 0.9, conductorPotentials);
    }

    function drawStreamlines(mesh, regions, grid) {
        drawContourFamily(mesh, regions, mesh.streamValues, mesh.streamMinimum, mesh.streamMaximum, grid);
    }

    function roundedBoundarySamples(region, targetSpacing) {
        const samples = [];
        const radius = region.radius;
        const addLine = (startX, startY, endX, endY, normalX, normalY) => {
            const length = Math.hypot(endX - startX, endY - startY);
            if (length < 0.5) return;
            const count = Math.max(1, Math.ceil(length / targetSpacing));
            const ds = length / count;
            for (let index = 0; index < count; index += 1) {
                const t = (index + 0.5) / count;
                samples.push({
                    ds,
                    normalX,
                    normalY,
                    x: startX + (endX - startX) * t,
                    y: startY + (endY - startY) * t
                });
            }
        };
        const addArc = (centerX, centerY, startAngle) => {
            if (radius < 0.5) return;
            const length = Math.PI * radius / 2;
            const count = Math.max(1, Math.ceil(length / targetSpacing));
            const ds = length / count;
            for (let index = 0; index < count; index += 1) {
                const angle = startAngle + (index + 0.5) / count * Math.PI / 2;
                const normalX = Math.cos(angle);
                const normalY = Math.sin(angle);
                samples.push({
                    ds,
                    normalX,
                    normalY,
                    x: centerX + normalX * radius,
                    y: centerY + normalY * radius
                });
            }
        };

        addLine(region.left + radius, region.top, region.right - radius, region.top, 0, -1);
        addArc(region.right - radius, region.top + radius, -Math.PI / 2);
        addLine(region.right, region.top + radius, region.right, region.bottom - radius, 1, 0);
        addArc(region.right - radius, region.bottom - radius, 0);
        addLine(region.right - radius, region.bottom, region.left + radius, region.bottom, 0, 1);
        addArc(region.left + radius, region.bottom - radius, Math.PI / 2);
        addLine(region.left, region.bottom - radius, region.left, region.top + radius, -1, 0);
        addArc(region.left + radius, region.top + radius, Math.PI);
        return samples;
    }

    function drawRegionContours(regions) {
        for (const region of regions) {
            context.beginPath();
            context.roundRect(region.left, region.top, region.right - region.left, region.bottom - region.top, region.radius);
            context.stroke();
        }
    }

    function draw() {
        const styles = getComputedStyle(root);
        const gridToken = styles.getPropertyValue('--grid').trim();
        const rootFontSize = parseFloat(styles.fontSize) || 16;
        const grid = (parseFloat(gridToken) || 1.5) * (gridToken.endsWith('rem') ? rootFontSize : 1);
        const width = Math.max(root.scrollWidth, window.innerWidth);
        const height = Math.max(root.scrollHeight, window.innerHeight);
        const ratio = Math.min(window.devicePixelRatio || 1, width * height > 12000000 ? 1 : 1.5);

        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        canvas.width = Math.ceil(width * ratio);
        canvas.height = Math.ceil(height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, width, height);
        context.strokeStyle = exportMode ? '#000' : styles.getPropertyValue('--grid-color').trim();
        context.lineWidth = 1;

        const regions = getRegions();
        const conductorSolution = solveFloatingConductors(regions, grid, height);
        const mesh = buildMesh(width, height, regions, conductorSolution, grid);
        drawEquipotentials(mesh, regions, grid, conductorSolution.conductorPotentials);
        drawStreamlines(mesh, regions, grid);
        drawRegionContours(regions);
        return { height, width };
    }

    async function settleLayout() {
        await document.fonts?.ready;
        await Promise.all(Array.from(document.images, async (image) => {
            if (image.complete) return;
            try {
                await image.decode();
            } catch {
                await new Promise((resolve) => {
                    image.addEventListener('load', resolve, { once: true });
                    image.addEventListener('error', resolve, { once: true });
                });
            }
        }));
        if (window.MathJax?.startup?.promise) await window.MathJax.startup.promise;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }

    if (exportMode) {
        window.__renderComplexGridSvg = async () => {
            await settleLayout();
            context = createSvgContext();
            const dimensions = draw();
            return {
                ...dimensions,
                svg: context.toSvg(dimensions.width, dimensions.height)
            };
        };
    } else {
        const resizeObserver = new ResizeObserver(scheduleDraw);
        resizeObserver.observe(document.body);
        new MutationObserver(scheduleDraw).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
        window.addEventListener('resize', scheduleDraw, { passive: true });
        window.addEventListener('load', scheduleDraw, { once: true });
        document.fonts?.ready.then(scheduleDraw);
        scheduleDraw();
    }
})();
