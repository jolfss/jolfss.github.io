(() => {
    const canvas = document.querySelector('[data-complex-grid]');
    if (!canvas) return;

    const root = document.documentElement;
    const query = new URLSearchParams(window.location.search);
    const exportMode = query.has('field-export');
    const fieldDebugMode = query.has('field-debug');
    const fieldProfileMode = query.has('field-profile');
    let context = canvas.getContext('2d');
    let animationFrame = 0;
    let contactFitStats = {};

    function profileProgress(stage, details = {}) {
        if (!fieldProfileMode) return;
        console.log(`[field-profile] ${stage} ${JSON.stringify({
            elapsed: Math.round(performance.now()),
            ...details
        })}`);
    }

    function resetContactFitStats() {
        contactFitStats = {
            accepted: 0,
            attempted: 0,
            candidateStarts: 0,
            corridorRejected: 0,
            laneRejected: 0,
            insideRejected: 0,
            maximumAnchorShift: 0,
            repeatedContactRejected: 0,
            fullyDiverged: 0,
            rejectedContacts: [],
            minimumBreakAngleDegrees: Infinity,
            maximumBreakAngleDegrees: 0
        };
    }

    function createSvgContext() {
        const paths = [];
        const rectangles = [];
        const filledRectangles = [];
        const rasterLayers = [];
        let segments = [];
        let roundedRectangles = [];
        let cursor = null;
        let boundaryRole = 'physical';
        let fillRole = 'none';
        let family = 'unclassified';
        let treatment = 'none';

        // Adjacent cells calculate their shared crossing independently. Treat
        // sub-tenth-pixel roundoff as the same topological vertex so the SVG
        // recorder cannot split one contour into apparently open subpaths.
        const keyForPoint = (point) => `${Math.round(point.x * 10)},${Math.round(point.y * 10)}`;
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
                filledRectangles.length = 0;
                rasterLayers.length = 0;
            },
            addRasterLayer(dataUrl, width, height, role) {
                rasterLayers.push({ dataUrl, height, role, width });
            },
            fillRect(x, y, width, height) {
                filledRectangles.push({ color: this.fillStyle, height, role: fillRole, width, x, y });
            },
            fillStyle: '#fff',
            lineTo(x, y) {
                const point = { x, y };
                if (cursor) segments.push([cursor, point, treatment]);
                cursor = point;
            },
            moveTo(x, y) {
                cursor = { x, y };
            },
            roundRect(x, y, width, height, radius) {
                roundedRectangles.push({ boundaryRole, height, radius, width, x, y });
            },
            setBoundaryRole(value) {
                boundaryRole = value;
            },
            setFillRole(value) {
                fillRole = value;
            },
            setFamily(value) {
                family = value;
            },
            setTreatment(value) {
                treatment = value;
            },
            setTransform() {},
            stroke() {
                if (segments.length) {
                    const treatments = new Set(segments.map((segment) => segment[2]));
                    for (const segmentTreatment of treatments) {
                        const matchingSegments = segments
                            .filter((segment) => segment[2] === segmentTreatment)
                            .map(([first, second]) => [first, second]);
                        const data = joinedPolylines(matchingSegments)
                            .filter((points) => {
                                let representedLength = 0;
                                for (let index = 1; index < points.length; index += 1) {
                                    representedLength += Math.hypot(
                                        points[index].x - points[index - 1].x,
                                        points[index].y - points[index - 1].y
                                    );
                                }
                                // A sub-half-pixel connected component is a
                                // zero-dimensional tangency after SVG coordinate
                                // quantization, not a renderable contour line.
                                return representedLength >= 0.5;
                            })
                            .map((points) => (
                                points.map((point, index) => `${index === 0 ? 'M' : 'L'}${number(point.x)} ${number(point.y)}`).join('')
                            )).join('');
                        if (data) paths.push({ data, family, treatment: segmentTreatment });
                    }
                }
                rectangles.push(...roundedRectangles);
            },
            toSvg(width, height) {
                const rasterMarkup = rasterLayers.map((layer) => (
                    `<image data-field-fill="${layer.role}" href="${layer.dataUrl}" x="0" y="0" width="${number(layer.width)}" height="${number(layer.height)}" preserveAspectRatio="none"/>`
                )).join('');
                const rectangleForFill = (rectangle) => (
                    `<rect data-field-fill="${rectangle.role}" x="${number(rectangle.x)}" y="${number(rectangle.y)}" width="${number(rectangle.width)}" height="${number(rectangle.height)}" fill="${rectangle.color}" stroke="none"/>`
                );
                const fillMarkup = filledRectangles.map(rectangleForFill).join('');
                const debugColor = (pathTreatment) => {
                    if (pathTreatment === 'contact-fit') return '#ff00d4';
                    if (pathTreatment === 'conductor-parent') return '#00c8ff';
                    return '#7c3cff';
                };
                const pathMarkup = paths.map(({ data, family: pathFamily, treatment: pathTreatment }) => (
                    `<path data-field-family="${pathFamily}" data-field-treatment="${pathTreatment}"${fieldDebugMode && pathTreatment !== 'none' ? ` stroke="${debugColor(pathTreatment)}" stroke-width="3"` : ''} d="${data}"/>`
                )).join('');
                const rectangleMarkup = rectangles.map((rectangle) => (
                    `<rect data-field-boundary="${rectangle.boundaryRole === 'physical'}" data-boundary-role="${rectangle.boundaryRole}" x="${number(rectangle.x)}" y="${number(rectangle.y)}" width="${number(rectangle.width)}" height="${number(rectangle.height)}" rx="${number(rectangle.radius)}"/>`
                )).join('');
                return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" stroke="#d7d7d7" stroke-width="1">${rasterMarkup}${fillMarkup}${pathMarkup}${rectangleMarkup}</svg>`;
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
        const elements = document.querySelectorAll('.pane, .resistor, .site-mark, .site-nav a, .button, pre, .table-scroll, .paper-figure-frame, .sidenote__content, .rb-sample-tabs button, .rb-doc, .rb-doc-frame, .rb-score-summary');
        const regions = Array.from(elements, (element) => {
            const rect = getPageRect(element);
            const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0;
            return {
                ...rect,
                isButton: element.matches('.site-mark, .site-nav a, .button, .rb-sample-tabs button'),
                kind: element.matches('.resistor, [data-field-boundary="resistor"]') ? 'resistor' : 'conductor',
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
        const centerDx = x - source.x;
        const centerDy = y - source.y;
        const centerDistanceSquared = centerDx * centerDx + centerDy * centerDy;
        if (centerDistanceSquared > source.ds * source.ds * 16) {
            return -Math.log(Math.max(centerDistanceSquared, 1e-12) / (referenceLength * referenceLength)) / (4 * Math.PI);
        }
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

    function segmentNormalDerivativeKernel(observation, source) {
        const dx = observation.x - source.x;
        const dy = observation.y - source.y;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared < 1e-12) {
            // Exterior trace of the single-layer potential. The half-density
            // jump is expressed in terms of the integrated panel charge.
            return -0.5 / Math.max(source.ds, 1e-6);
        }
        return -(
            observation.normalX * dx + observation.normalY * dy
        ) / (2 * Math.PI * distanceSquared);
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
        const centerDistanceSquared = (x - source.x) ** 2 + (y - source.y) ** 2;
        if (centerDistanceSquared > source.ds * source.ds * 16) {
            return -relativeAngle(source.x, source.y) / (2 * Math.PI);
        }
        const firstAngle = relativeAngle(source.x + tangentX * offset, source.y + tangentY * offset);
        const secondAngle = relativeAngle(source.x - tangentX * offset, source.y - tangentY * offset);
        return -(firstAngle + secondAngle) / (4 * Math.PI);
    }

    function solveFloatingConductors(regions, grid, height) {
        const samples = [];
        // Resolve straight faces below the grid cadence; rounded corners are
        // refined independently in roundedBoundarySamples.
        const sampleSpacing = Math.max(8, grid * 0.75);
        regions.forEach((region, regionIndex) => {
            for (const sample of roundedBoundarySamples(region, sampleSpacing)) {
                samples.push({ ...sample, regionIndex });
            }
        });

        const conductorRegionIndices = regions
            .map((region, index) => ({ index, region }))
            .filter(({ region }) => region.kind !== 'resistor')
            .map(({ index }) => index);
        const conductorColumnByRegion = new Map(conductorRegionIndices.map((regionIndex, column) => (
            [regionIndex, column]
        )));
        const sampleCount = samples.length;
        const size = sampleCount + conductorRegionIndices.length;
        const matrix = Array.from({ length: size }, () => new Float64Array(size));
        const rightHandSide = new Float64Array(size);
        const referenceLength = Math.max(height, 1);

        for (let row = 0; row < sampleCount; row += 1) {
            const observation = samples[row];
            const region = regions[observation.regionIndex];
            if (region.kind === 'resistor') {
                for (let column = 0; column < sampleCount; column += 1) {
                    matrix[row][column] = segmentNormalDerivativeKernel(observation, samples[column]);
                }
                rightHandSide[row] = -observation.normalY;
            } else {
                for (let column = 0; column < sampleCount; column += 1) {
                    const source = samples[column];
                    matrix[row][column] = row === column
                        ? -Math.log(Math.max(source.ds / (2 * Math.E), 0.25) / referenceLength) / (2 * Math.PI)
                        : segmentKernel(observation.x, observation.y, source, referenceLength);
                }
                matrix[row][sampleCount + conductorColumnByRegion.get(observation.regionIndex)] = -1;
                rightHandSide[row] = -(observation.y - height / 2);
            }
        }

        // The exterior Neumann equation for an insulating obstacle has one
        // redundant collocation equation. Replace it with the physical
        // compatibility condition: no obstacle may create net flux. Without
        // this constraint, the small discretization residual behaves like a
        // monopole. Its multivalued stream function then leaves a branch seam
        // (and sometimes a doubled contour) far away from the resistor.
        regions.forEach((region, regionIndex) => {
            if (region.kind !== 'resistor') return;
            const constraintRow = samples.findIndex((sample) => sample.regionIndex === regionIndex);
            if (constraintRow < 0) return;
            matrix[constraintRow].fill(0);
            for (let column = 0; column < sampleCount; column += 1) {
                if (samples[column].regionIndex === regionIndex) matrix[constraintRow][column] = 1;
            }
            rightHandSide[constraintRow] = 0;
        });

        conductorRegionIndices.forEach((regionIndex, conductorIndex) => {
            const row = sampleCount + conductorIndex;
            for (let column = 0; column < sampleCount; column += 1) {
                if (samples[column].regionIndex === regionIndex) matrix[row][column] = 1;
            }
        });

        const solution = solveLinearSystem(matrix, rightHandSide);
        samples.forEach((sample, index) => { sample.charge = solution[index]; });
        const conductorPotentials = Array(regions.length).fill(null);
        conductorRegionIndices.forEach((regionIndex, conductorIndex) => {
            conductorPotentials[regionIndex] = solution[sampleCount + conductorIndex];
        });
        const sourceGroups = regions.map((region, regionIndex) => {
            const reference = {
                x: (region.left + region.right) / 2,
                y: (region.top + region.bottom) / 2
            };
            const sources = samples.filter((sample) => sample.regionIndex === regionIndex);
            const clusters = [];
            for (let start = 0; start < sources.length; start += 8) {
                const members = sources.slice(start, start + 8);
                const clusterReference = {
                    x: members.reduce((sum, source) => sum + source.x, 0) / members.length,
                    y: members.reduce((sum, source) => sum + source.y, 0) / members.length
                };
                clusters.push({
                    charge: members.reduce((sum, source) => sum + source.charge, 0),
                    momentX: members.reduce((sum, source) => (
                        sum + source.charge * (source.x - clusterReference.x)
                    ), 0),
                    momentY: members.reduce((sum, source) => (
                        sum + source.charge * (source.y - clusterReference.y)
                    ), 0),
                    momentXXMinusYY: members.reduce((sum, source) => {
                        const dx = source.x - clusterReference.x;
                        const dy = source.y - clusterReference.y;
                        return sum + source.charge * (dx * dx - dy * dy);
                    }, 0),
                    moment2XY: members.reduce((sum, source) => {
                        const dx = source.x - clusterReference.x;
                        const dy = source.y - clusterReference.y;
                        return sum + source.charge * 2 * dx * dy;
                    }, 0),
                    radius: Math.max(...members.map((source) => (
                        Math.hypot(source.x - clusterReference.x, source.y - clusterReference.y) + source.ds / 2
                    ))),
                    reference: clusterReference,
                    sources: members,
                    streamReference: reference
                });
            }
            return {
                charge: sources.reduce((sum, source) => sum + source.charge, 0),
                clusters,
                momentX: sources.reduce((sum, source) => (
                    sum + source.charge * (source.x - reference.x)
                ), 0),
                momentY: sources.reduce((sum, source) => (
                    sum + source.charge * (source.y - reference.y)
                ), 0),
                momentXXMinusYY: sources.reduce((sum, source) => {
                    const dx = source.x - reference.x;
                    const dy = source.y - reference.y;
                    return sum + source.charge * (dx * dx - dy * dy);
                }, 0),
                moment2XY: sources.reduce((sum, source) => {
                    const dx = source.x - reference.x;
                    const dy = source.y - reference.y;
                    return sum + source.charge * 2 * dx * dy;
                }, 0),
                radius: Math.hypot(region.right - region.left, region.bottom - region.top) / 2,
                reference,
                sources,
                streamReference: reference
            };
        });
        return {
            conductorPotentials,
            referenceLength,
            sourceGroups
        };
    }

    function groupPotentialKernel(x, y, group, referenceLength) {
        const dx = x - group.reference.x;
        const dy = y - group.reference.y;
        const distanceSquared = Math.max(dx * dx + dy * dy, 1e-12);
        const monopole = -group.charge * Math.log(
            distanceSquared / (referenceLength * referenceLength)
        ) / (4 * Math.PI);
        const dipole = (dx * group.momentX + dy * group.momentY) / (
            2 * Math.PI * distanceSquared
        );
        const distanceFourth = distanceSquared * distanceSquared;
        const quadrupole = (
            group.momentXXMinusYY * (dx * dx - dy * dy)
            + group.moment2XY * 2 * dx * dy
        ) / (4 * Math.PI * distanceFourth);
        return monopole + dipole + quadrupole;
    }

    function groupStreamKernel(x, y, group) {
        const dx = x - group.reference.x;
        const dy = y - group.reference.y;
        const distanceSquared = Math.max(dx * dx + dy * dy, 1e-12);
        const bx = x - group.streamReference.x;
        const by = y - group.streamReference.y;
        const relativeAngle = Math.atan2(dy * bx - dx * by, dx * bx + dy * by);
        const distanceFourth = distanceSquared * distanceSquared;
        const quadrupole = (
            group.momentXXMinusYY * 2 * dx * dy
            - group.moment2XY * (dx * dx - dy * dy)
        ) / (4 * Math.PI * distanceFourth);
        return -group.charge * relativeAngle / (2 * Math.PI)
            - (dx * group.momentY - dy * group.momentX) / (2 * Math.PI * distanceSquared)
            + quadrupole;
    }

    function smootherstep(value) {
        const t = Math.max(0, Math.min(1, value));
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    function buildAxisCoordinates(length, spacing, fineSpacing, regions, axis) {
        const coordinates = [];
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
        // Keep the regular mesh below the 0.9-grid contour cadence, with a
        // much finer independent strip where contact geometry is sensitive.
        const spacing = Math.max(9, grid * 0.625);
        const fineSpacing = Math.max(1.5, grid / 12);
        const xCoordinates = buildAxisCoordinates(width, spacing, fineSpacing, regions, 'x');
        const yCoordinates = buildAxisCoordinates(height, spacing, fineSpacing, regions, 'y');
        const columns = xCoordinates.length;
        const rows = yCoordinates.length;
        const streamValues = new Float64Array(columns * rows);
        const values = new Float64Array(columns * rows);
        const { conductorPotentials, referenceLength, sourceGroups } = conductorSolution;
        let minimum = Infinity;
        let maximum = -Infinity;
        let streamMinimum = Infinity;
        let streamMaximum = -Infinity;
        const progressInterval = Math.max(1, Math.ceil(rows / 20));

        profileProgress('mesh:coordinates', {
            columns,
            fineSpacing,
            nodes: columns * rows,
            regions: regions.length,
            rows,
            sourceGroups: sourceGroups.length,
            sources: sourceGroups.reduce((total, group) => total + group.sources.length, 0),
            spacing
        });

        for (let row = 0; row < rows; row += 1) {
            if (row % progressInterval === 0) profileProgress('mesh:row', { row, rows });
            const y = yCoordinates[row];
            for (let column = 0; column < columns; column += 1) {
                const x = xCoordinates[column];
                const index = row * columns + column;
                const containingRegion = containingRegionIndex(x, y, regions);
                const containedRegion = containingRegion >= 0 ? regions[containingRegion] : null;
                const insideConductor = containedRegion?.kind !== 'resistor' && containingRegion >= 0;
                let potential = insideConductor ? conductorPotentials[containingRegion] : y - height / 2;
                let stream = -x;
                for (const group of sourceGroups) {
                    // Stream functions are angle-valued. Blending separately
                    // anchored multipole approximations can differ by a branch
                    // constant even when their gradients agree, producing
                    // false seams, doubled contours, and interior endpoints.
                    // Evaluate the solved panels directly so every streamline
                    // is a level set of one globally consistent function.
                    for (const sample of group.sources) {
                        stream += sample.charge * segmentStreamKernel(
                            x,
                            y,
                            sample,
                            group.streamReference
                        );
                    }
                    const dx = x - group.reference.x;
                    const dy = y - group.reference.y;
                    const distance = Math.hypot(dx, dy);
                    if (distance >= group.radius * 6) {
                        if (!insideConductor) {
                            potential += groupPotentialKernel(x, y, group, referenceLength);
                        }
                        continue;
                    }
                    let detailedPotential = 0;
                    for (const cluster of group.clusters) {
                        const clusterDx = x - cluster.reference.x;
                        const clusterDy = y - cluster.reference.y;
                        const clusterDistance = Math.hypot(clusterDx, clusterDy);
                        if (clusterDistance >= cluster.radius * 5) {
                            if (!insideConductor) {
                                detailedPotential += groupPotentialKernel(x, y, cluster, referenceLength);
                            }
                            continue;
                        }
                        let exactPotential = 0;
                        for (const sample of cluster.sources) {
                            if (!insideConductor) {
                                exactPotential += sample.charge * segmentKernel(x, y, sample, referenceLength);
                            }
                        }
                        if (clusterDistance > cluster.radius * 3) {
                            const clusterT = (clusterDistance / cluster.radius - 3) / 2;
                            const clusterBlend = smootherstep(clusterT);
                            if (!insideConductor) {
                                detailedPotential += exactPotential * (1 - clusterBlend)
                                    + groupPotentialKernel(x, y, cluster, referenceLength) * clusterBlend;
                            }
                        } else {
                            if (!insideConductor) detailedPotential += exactPotential;
                        }
                    }
                    if (distance > group.radius * 4) {
                        const t = (distance / group.radius - 4) / 2;
                        const blend = smootherstep(t);
                        if (!insideConductor) {
                            potential += detailedPotential * (1 - blend)
                                + groupPotentialKernel(x, y, group, referenceLength) * blend;
                        }
                    } else {
                        if (!insideConductor) potential += detailedPotential;
                    }
                }
                values[index] = potential;
                streamValues[index] = stream;
                if (containedRegion?.kind !== 'resistor') {
                    minimum = Math.min(minimum, potential);
                    maximum = Math.max(maximum, potential);
                }
                if (containingRegion < 0) {
                    streamMinimum = Math.min(streamMinimum, stream);
                    streamMaximum = Math.max(streamMaximum, stream);
                }
            }
        }
        profileProgress('mesh:complete', { columns, nodes: columns * rows, rows });
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
        let t = Math.abs(difference) < 1e-9 ? 0.5 : (level - firstValue) / difference;
        const edgeLength = Math.hypot(secondX - firstX, secondY - firstY);
        const vertexTolerance = Math.min(0.1 / Math.max(edgeLength, 1e-9), 0.25);
        if (t < vertexTolerance) t = 0;
        else if (t > 1 - vertexTolerance) t = 1;
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
        // The SVG recorder rounds coordinates to hundredths. Segments shorter
        // than that quantize to a point and have no representable geometry.
        if (Math.hypot(end.x - start.x, end.y - start.y) < 0.01) return null;
        return [start, end];
    }

    function drawClippedSegment(first, second, regions) {
        const segment = clippedSegment(first, second, regions);
        if (!segment) return;
        const [start, end] = segment;
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
    }

    function drawContourSegments(segments) {
        if (!segments.length) return;
        const keyForPoint = (point) => `${Math.round(point.x * 10)},${Math.round(point.y * 10)}`;
        const adjacency = new Map();
        segments.forEach((segment, index) => {
            for (const point of segment) {
                const key = keyForPoint(point);
                if (!adjacency.has(key)) adjacency.set(key, []);
                adjacency.get(key).push(index);
            }
        });

        const visited = new Uint8Array(segments.length);
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
            for (const index of component) {
                const [start, end] = segments[index];
                context.moveTo(start.x, start.y);
                context.lineTo(end.x, end.y);
            }
        }
    }

    function joinedContourPolylines(segments) {
        const keyForPoint = (point) => `${Math.round(point.x * 10)},${Math.round(point.y * 10)}`;
        const adjacency = new Map();
        segments.forEach((segment, index) => {
            segment.forEach((point, endpoint) => {
                const key = keyForPoint(point);
                if (!adjacency.has(key)) adjacency.set(key, []);
                adjacency.get(key).push({ endpoint, index });
            });
        });
        const visited = new Uint8Array(segments.length);
        const polylines = [];
        const extend = (points, prepend) => {
            while (true) {
                const point = prepend ? points[0] : points.at(-1);
                const next = adjacency.get(keyForPoint(point))?.find((entry) => !visited[entry.index]);
                if (!next) return;
                visited[next.index] = 1;
                const other = segments[next.index][next.endpoint === 0 ? 1 : 0];
                if (prepend) points.unshift(other);
                else points.push(other);
            }
        };
        const order = segments.map((_, index) => index).sort((first, second) => {
            const firstOpen = adjacency.get(keyForPoint(segments[first][0])).length !== 2;
            const secondOpen = adjacency.get(keyForPoint(segments[second][0])).length !== 2;
            return Number(secondOpen) - Number(firstOpen);
        });
        for (const index of order) {
            if (visited[index]) continue;
            visited[index] = 1;
            const points = [...segments[index]];
            extend(points, false);
            extend(points, true);
            polylines.push(points);
        }
        return polylines;
    }

    function nearestSegmentInfo(point, segments) {
        let best = null;
        for (const [start, end] of segments) {
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const lengthSquared = dx * dx + dy * dy;
            const amount = lengthSquared > 1e-12
                ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared))
                : 0;
            const projected = { x: start.x + dx * amount, y: start.y + dy * amount };
            const distance = Math.hypot(point.x - projected.x, point.y - projected.y);
            if (!best || distance < best.distance) best = { distance, dx, dy, point: projected };
        }
        return best;
    }

    function unorientedAngleBetween(firstX, firstY, secondX, secondY) {
        const firstLength = Math.hypot(firstX, firstY);
        const secondLength = Math.hypot(secondX, secondY);
        if (firstLength < 1e-9 || secondLength < 1e-9) return 0;
        const cosine = Math.abs(
            (firstX * secondX + firstY * secondY) / (firstLength * secondLength)
        );
        return Math.acos(Math.max(-1, Math.min(1, cosine)));
    }

    // A contour may be gently fitted once it is genuinely at a conductor,
    // but must never be captured merely because it passes through the wider
    // visual contact band. Keeping those radii distinct leaves nearby level
    // sets to take their natural route around the conductor.
    const conductorContactRadius = 4;
    const conductorSnapDistance = 1.25;
    const contactDivergenceThreshold = 12 * Math.PI / 180;

    function cubicPoint(t, start, firstControl, secondControl, end) {
        const u = 1 - t;
        return {
            x: u ** 3 * start.x
                + 3 * u * u * t * firstControl.x
                + 3 * u * t * t * secondControl.x
                + t ** 3 * end.x,
            y: u ** 3 * start.y
                + 3 * u * u * t * firstControl.y
                + 3 * u * t * t * secondControl.y
                + t ** 3 * end.y
        };
    }

    function cubicDerivative(t, start, firstControl, secondControl, end) {
        const u = 1 - t;
        return {
            x: 3 * u * u * (firstControl.x - start.x)
                + 6 * u * t * (secondControl.x - firstControl.x)
                + 3 * t * t * (end.x - secondControl.x),
            y: 3 * u * u * (firstControl.y - start.y)
                + 6 * u * t * (secondControl.y - firstControl.y)
                + 3 * t * t * (end.y - secondControl.y)
        };
    }

    function roundedRectNormal(point, region) {
        const innerLeft = region.left + region.radius;
        const innerRight = region.right - region.radius;
        const innerTop = region.top + region.radius;
        const innerBottom = region.bottom - region.radius;
        const anchorX = Math.max(innerLeft, Math.min(innerRight, point.x));
        const anchorY = Math.max(innerTop, Math.min(innerBottom, point.y));
        let dx = point.x - anchorX;
        let dy = point.y - anchorY;
        let length = Math.hypot(dx, dy);
        if (length > 1e-9) return { x: dx / length, y: dy / length };
        const sides = [
            { distance: Math.abs(point.x - region.left), x: -1, y: 0 },
            { distance: Math.abs(point.x - region.right), x: 1, y: 0 },
            { distance: Math.abs(point.y - region.top), x: 0, y: -1 },
            { distance: Math.abs(point.y - region.bottom), x: 0, y: 1 }
        ].sort((first, second) => first.distance - second.distance);
        ({ x: dx, y: dy } = sides[0]);
        length = Math.hypot(dx, dy);
        return { x: dx / length, y: dy / length };
    }

    function roundedRectBoundaryPoint(point, region) {
        const distance = roundedRectDistance(point.x, point.y, region);
        const normal = roundedRectNormal(point, region);
        return {
            normal,
            x: point.x - normal.x * distance,
            y: point.y - normal.y * distance
        };
    }

    function traceCubicContact(start, incomingTangent, contactTangent, rawContact, region) {
        // A single Hermite segment is the whole adjustment. It begins exactly
        // on the original level set and preserves the solved contour tangent
        // at both ends. The conductor is only an endpoint boundary for an
        // equipotential bridge; it does not impose a normal-contact condition.
        const end = roundedRectBoundaryPoint(rawContact, region);
        const chordX = end.x - start.x;
        const chordY = end.y - start.y;
        const length = Math.hypot(chordX, chordY);
        if (length < 2) return null;
        const chord = { x: chordX / length, y: chordY / length };
        let outgoingTangent = { ...contactTangent };
        if (outgoingTangent.x * chord.x + outgoingTangent.y * chord.y < 0) {
            outgoingTangent = { x: -outgoingTangent.x, y: -outgoingTangent.y };
        }
        if (incomingTangent.x * chord.x + incomingTangent.y * chord.y < 0.08
            || outgoingTangent.x * chord.x + outgoingTangent.y * chord.y < 0.02) return null;
        const handle = Math.max(2, Math.min(length * 0.32, 32));
        const firstControl = {
            x: start.x + incomingTangent.x * handle,
            y: start.y + incomingTangent.y * handle
        };
        const secondControl = {
            x: end.x - outgoingTangent.x * handle,
            y: end.y - outgoingTangent.y * handle
        };
        const points = [{ ...start }];
        const samples = Math.max(8, Math.ceil(length / 1.5));
        let previous = start;
        for (let index = 1; index <= samples; index += 1) {
            const point = index === samples ? { x: end.x, y: end.y }
                : cubicPoint(index / samples, start, firstControl, secondControl, end);
            const dx = point.x - previous.x;
            const dy = point.y - previous.y;
            if (Math.hypot(dx, dy) < 1e-7 || dx * chord.x + dy * chord.y <= 0) return null;
            points.push({ ...point, _fieldDeviation: true });
            previous = point;
        }
        return points;
    }

    function roundedRectPerimeter(region) {
        const width = region.right - region.left;
        const height = region.bottom - region.top;
        return 2 * (width + height - 4 * region.radius) + 2 * Math.PI * region.radius;
    }

    function roundedRectPointAtArc(region, arc) {
        const radius = region.radius;
        const horizontal = region.right - region.left - 2 * radius;
        const vertical = region.bottom - region.top - 2 * radius;
        const corner = Math.PI * radius / 2;
        const perimeter = roundedRectPerimeter(region);
        let distance = ((arc % perimeter) + perimeter) % perimeter;
        if (distance <= horizontal) return {
            normal: { x: 0, y: -1 },
            x: region.left + radius + distance,
            y: region.top
        };
        distance -= horizontal;
        if (distance <= corner) {
            const angle = -Math.PI / 2 + distance / Math.max(radius, 1e-9);
            return {
                normal: { x: Math.cos(angle), y: Math.sin(angle) },
                x: region.right - radius + Math.cos(angle) * radius,
                y: region.top + radius + Math.sin(angle) * radius
            };
        }
        distance -= corner;
        if (distance <= vertical) return {
            normal: { x: 1, y: 0 },
            x: region.right,
            y: region.top + radius + distance
        };
        distance -= vertical;
        if (distance <= corner) {
            const angle = distance / Math.max(radius, 1e-9);
            return {
                normal: { x: Math.cos(angle), y: Math.sin(angle) },
                x: region.right - radius + Math.cos(angle) * radius,
                y: region.bottom - radius + Math.sin(angle) * radius
            };
        }
        distance -= corner;
        if (distance <= horizontal) return {
            normal: { x: 0, y: 1 },
            x: region.right - radius - distance,
            y: region.bottom
        };
        distance -= horizontal;
        if (distance <= corner) {
            const angle = Math.PI / 2 + distance / Math.max(radius, 1e-9);
            return {
                normal: { x: Math.cos(angle), y: Math.sin(angle) },
                x: region.left + radius + Math.cos(angle) * radius,
                y: region.bottom - radius + Math.sin(angle) * radius
            };
        }
        distance -= corner;
        if (distance <= vertical) return {
            normal: { x: -1, y: 0 },
            x: region.left,
            y: region.bottom - radius - distance
        };
        distance -= vertical;
        const angle = Math.PI + distance / Math.max(radius, 1e-9);
        return {
            normal: { x: Math.cos(angle), y: Math.sin(angle) },
            x: region.left + radius + Math.cos(angle) * radius,
            y: region.top + radius + Math.sin(angle) * radius
        };
    }

    function sampleMeshValue(mesh, values, x, y) {
        const bracket = (coordinates, value) => {
            if (value <= coordinates[0]) return [0, 0, 0];
            if (value >= coordinates.at(-1)) {
                const last = coordinates.length - 1;
                return [last, last, 0];
            }
            let low = 0;
            let high = coordinates.length - 1;
            while (high - low > 1) {
                const middle = (low + high) >> 1;
                if (coordinates[middle] <= value) low = middle;
                else high = middle;
            }
            return [low, high, (value - coordinates[low]) / (coordinates[high] - coordinates[low])];
        };
        const [left, right, tx] = bracket(mesh.xCoordinates, x);
        const [top, bottom, ty] = bracket(mesh.yCoordinates, y);
        const topValue = values[top * mesh.columns + left] * (1 - tx)
            + values[top * mesh.columns + right] * tx;
        const bottomValue = values[bottom * mesh.columns + left] * (1 - tx)
            + values[bottom * mesh.columns + right] * tx;
        return topValue * (1 - ty) + bottomValue * ty;
    }


    function fluxIntersection(a, b, c, d) {
        if (Math.max(a.x, b.x) < Math.min(c.x, d.x) || Math.min(a.x, b.x) > Math.max(c.x, d.x)
            || Math.max(a.y, b.y) < Math.min(c.y, d.y) || Math.min(a.y, b.y) > Math.max(c.y, d.y)) return null;
        const rx = b.x - a.x, ry = b.y - a.y;
        const sx = d.x - c.x, sy = d.y - c.y;
        const determinant = rx * sy - ry * sx;
        if (Math.abs(determinant) < 1e-12) return null;
        const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / determinant;
        const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / determinant;
        return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
    }

    function lastFluxCrossing(points, segments) {
        let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
        for (const point of points) {
            left = Math.min(left, point.x); right = Math.max(right, point.x);
            top = Math.min(top, point.y); bottom = Math.max(bottom, point.y);
        }
        const nearby = segments.filter(([a, b]) => Math.max(a.x, b.x) >= left
            && Math.min(a.x, b.x) <= right && Math.max(a.y, b.y) >= top && Math.min(a.y, b.y) <= bottom);
        for (let index = points.length - 1; index > 0; index -= 1) {
            let amount = -1;
            for (const [a, b] of nearby) {
                const hit = fluxIntersection(points[index - 1], points[index], a, b);
                if (hit !== null) amount = Math.max(amount, hit);
            }
            if (amount >= 0) return { index, amount };
        }
        return null;
    }

    function constrainedParentContactJoin(points, candidates, parentSegments, adjacentSegments, mesh) {
        if (points.length < 4 || !parentSegments.length) return points;
        const rawContact = points.at(-1);
        const candidate = candidates.find(({ region }) => (
            Math.abs(roundedRectDistance(rawContact.x, rawContact.y, region)) <= conductorContactRadius + 0.001
        ));
        if (!candidate) return points;
        contactFitStats.attempted += 1;

        // The sole break-point rule: retain the existing curve until its
        // tangent differs by D from the tangent at the nearest point on an
        // original adjacent contour.
        // If the whole visible parent is already separated by D, the fit owns
        // the whole visible parent. Starting at the penultimate sample in that
        // case was an inverted fallback: it forced a large correction through
        // a few pixels and produced the small hooks/loops seen in debug mode.
        let breakIndex = 1;
        let breakPoint = points[breakIndex];
        let foundUndivergedSample = false;
        let breakSeparation = Infinity;
        const separationAt = (index) => {
            const parent = nearestSegmentInfo(points[index], parentSegments);
            if (!parent) return Infinity;
            return Math.max(0, ...adjacentSegments.map((segments) => {
                // Both tangents come from the immutable, unmodified contour
                // family. A previously adjusted curve must never move the
                // divergence trigger for its neighbor.
                const neighbor = nearestSegmentInfo(parent.point, segments);
                return neighbor
                    ? unorientedAngleBetween(parent.dx, parent.dy, neighbor.dx, neighbor.dy)
                    : 0;
            }));
        };
        for (let index = points.length - 2; index >= 1; index -= 1) {
            const separation = separationAt(index);
            if (separation < contactDivergenceThreshold) {
                foundUndivergedSample = true;
                const divergentIndex = Math.min(points.length - 2, index + 1);
                const divergentSeparation = separationAt(divergentIndex);
                if (divergentSeparation >= contactDivergenceThreshold) {
                    const amount = Math.max(0, Math.min(1, (
                        contactDivergenceThreshold - separation
                    ) / Math.max(divergentSeparation - separation, 1e-9)));
                    breakIndex = index + 1;
                    breakPoint = {
                        x: points[index].x + (points[divergentIndex].x - points[index].x) * amount,
                        y: points[index].y + (points[divergentIndex].y - points[index].y) * amount
                    };
                    breakSeparation = contactDivergenceThreshold;
                } else {
                    // The contact itself may occur before this polyline ever
                    // reaches D. Preserve the final original sample rather
                    // than manufacturing an earlier break.
                    breakIndex = divergentIndex;
                    breakPoint = points[divergentIndex];
                    breakSeparation = divergentSeparation;
                }
                break;
            }
        }
        if (!foundUndivergedSample) {
            contactFitStats.fullyDiverged += 1;
            breakSeparation = separationAt(breakIndex);
        }
        if (Number.isFinite(breakSeparation)) {
            const breakDegrees = breakSeparation * 180 / Math.PI;
            contactFitStats.minimumBreakAngleDegrees = Math.min(
                contactFitStats.minimumBreakAngleDegrees,
                breakDegrees
            );
            contactFitStats.maximumBreakAngleDegrees = Math.max(
                contactFitStats.maximumBreakAngleDegrees,
                breakDegrees
            );
        }
        contactFitStats.candidateStarts += 1;

        // Never modify a solved equipotential/flux intersection. Retain an
        // additional original sample after the last crossing so its tangent
        // is untouched too. Divergence may delay the fit, never advance it.
        const fluxSegments = mesh.fluxSegments || [];
        const crossing = lastFluxCrossing(points, fluxSegments);
        if (crossing && crossing.index >= breakIndex) {
            breakIndex = crossing.index + 1;
            if (breakIndex >= points.length) return points;
            breakPoint = points[breakIndex];
        }

        const start = breakPoint;
        const preceding = points[Math.max(0, breakIndex - 1)];
        const direction = { x: start.x - preceding.x, y: start.y - preceding.y };
        const directionLength = Math.hypot(direction.x, direction.y);
        if (directionLength < 1e-6) return points;
        const startTangent = { x: direction.x / directionLength, y: direction.y / directionLength };
        const contactDirection = {
            x: rawContact.x - points.at(-2).x,
            y: rawContact.y - points.at(-2).y
        };
        const contactDirectionLength = Math.hypot(contactDirection.x, contactDirection.y);
        if (contactDirectionLength < 1e-6) return points;
        const contactTangent = {
            x: contactDirection.x / contactDirectionLength,
            y: contactDirection.y / contactDirectionLength
        };
        const traced = traceCubicContact(
            start,
            startTangent,
            contactTangent,
            rawContact,
            candidate.region
        );
        if (!traced) return points;
        // The final gap must really be flux-free; do not hide invalid fits by
        // trimming them or deleting another line. The caller displays the
        // unmodified, unresolved contour brightly when this check fails.
        if (lastFluxCrossing(traced, fluxSegments)) return points;
        contactFitStats.accepted += 1;
        const fitted = [...points.slice(0, breakIndex), ...traced];
        fitted.fitStartIndex = breakIndex;
        return fitted;
    }

    function rollingCircleGeometry(point, adjacentSegments) {
        if (adjacentSegments.length !== 2) return null;
        const first = nearestSegmentInfo(point, adjacentSegments[0]);
        const second = nearestSegmentInfo(point, adjacentSegments[1]);
        if (!first || !second || first.distance < 1e-8 || second.distance < 1e-8) return null;
        const firstNormal = { x: (point.x - first.point.x) / first.distance,
            y: (point.y - first.point.y) / first.distance };
        const secondNormal = { x: (point.x - second.point.x) / second.distance,
            y: (point.y - second.point.y) / second.distance };
        const gx = firstNormal.x - secondNormal.x;
        const gy = firstNormal.y - secondNormal.y;
        const length = Math.hypot(gx, gy);
        // Degenerate gradients identify an external/ambiguous branch rather
        // than a circle sitting in the corridor between the two neighbors.
        if (length < 0.1) return null;
        return { first, second, gx, gy, gradientSquared: length * length,
            residual: first.distance - second.distance,
            radius: (first.distance + second.distance) / 2,
            tangent: { x: -gy / length, y: gx / length } };
    }

    function projectRollingCenter(seed, adjacentSegments, maximumCorrection) {
        let point = { x: seed.x, y: seed.y };
        for (let iteration = 0; iteration < 24; iteration += 1) {
            const geometry = rollingCircleGeometry(point, adjacentSegments);
            if (!geometry) return null;
            if (Math.abs(geometry.residual) < 1e-5) return { point, geometry };
            const amount = geometry.residual / geometry.gradientSquared;
            point = { x: point.x - geometry.gx * amount, y: point.y - geometry.gy * amount };
            if (Math.hypot(point.x - seed.x, point.y - seed.y) > maximumCorrection) return null;
        }
        return null;
    }

    function rollingContactDirection(point, geometry, direction, region) {
        let tangent = geometry.tangent;
        if (tangent.x * direction.x + tangent.y * direction.y < 0) {
            tangent = { x: -tangent.x, y: -tangent.y };
        }
        const distance = Math.max(0, roundedRectDistance(point.x, point.y, region));
        const width = Math.max(0.1, geometry.radius * 0.5);
        const t = Math.max(0, Math.min(1, 1 - distance / width));
        const weight = t * t * (3 - 2 * t);
        const normal = roundedRectNormal(point, region);
        const x = tangent.x * (1 - weight) - normal.x * weight;
        const y = tangent.y * (1 - weight) - normal.y * weight;
        const length = Math.hypot(x, y);
        if (length < 1e-8) return null;
        return { x: x / length, y: y / length, weight };
    }

    function traceRollingCenters(start, incomingTangent, adjacentSegments, region) {
        const initialGeometry = rollingCircleGeometry(start, adjacentSegments);
        if (!initialGeometry) return null;
        const initial = projectRollingCenter(start, adjacentSegments, initialGeometry.radius);
        if (!initial || roundedRectDistance(initial.point.x, initial.point.y, region) <= 0) return null;
        const points = [{ ...start }];
        if (Math.hypot(initial.point.x - start.x, initial.point.y - start.y) > 1e-7) {
            points.push({ ...initial.point, _fieldDeviation: true });
        }
        let current = initial;
        let direction = incomingTangent;
        let travelled = 0;
        const maximumLength = Math.max(256,
            roundedRectDistance(start.x, start.y, region) * 8 + initialGeometry.radius * 8);
        for (let iteration = 0; iteration < 8192; iteration += 1) {
            const tangent = rollingContactDirection(current.point, current.geometry, direction, region);
            if (!tangent) return null;
            let step = Math.min(2, Math.max(0.05, current.geometry.radius * 0.04));
            let next = null;
            for (let retry = 0; retry < 8; retry += 1) {
                const predicted = { x: current.point.x + tangent.x * step,
                    y: current.point.y + tangent.y * step };
                if (tangent.weight > 0) {
                    // Inside the contact layer, integrate the smoothly blended
                    // direction. Reprojecting onto the bisector here would
                    // undo the boundary-normal condition on every step.
                    const midpoint = { x: current.point.x + tangent.x * step / 2,
                        y: current.point.y + tangent.y * step / 2 };
                    const middleGeometry = rollingCircleGeometry(midpoint, adjacentSegments);
                    const middleDirection = middleGeometry
                        && rollingContactDirection(midpoint, middleGeometry, tangent, region);
                    if (middleDirection) {
                        const point = { x: current.point.x + middleDirection.x * step,
                            y: current.point.y + middleDirection.y * step };
                        const geometry = rollingCircleGeometry(point, adjacentSegments);
                        next = geometry ? { point, geometry } : null;
                    }
                } else {
                    next = projectRollingCenter(predicted, adjacentSegments, step * 0.75);
                }
                if (next) {
                    const dx = next.point.x - current.point.x;
                    const dy = next.point.y - current.point.y;
                    if (dx * tangent.x + dy * tangent.y > step * 0.25) break;
                    next = null;
                }
                step /= 2;
            }
            if (!next) return null;
            if (roundedRectDistance(next.point.x, next.point.y, region) <= 0) {
                let outside = current.point;
                let inside = next.point;
                for (let refinement = 0; refinement < 24; refinement += 1) {
                    const middle = { point: {
                        x: (outside.x + inside.x) / 2, y: (outside.y + inside.y) / 2
                    } };
                    if (roundedRectDistance(middle.point.x, middle.point.y, region) > 0) outside = middle.point;
                    else inside = middle.point;
                }
                points.push({ ...inside, _fieldDeviation: true });
                return points;
            }
            const dx = next.point.x - current.point.x;
            const dy = next.point.y - current.point.y;
            const length = Math.hypot(dx, dy);
            travelled += length;
            if (travelled > maximumLength || length < 1e-7) return null;
            // Follow one continuous medial branch; never accept a closed lap.
            for (let earlier = 1; earlier < points.length - 12; earlier += 1) {
                if (Math.hypot(next.point.x - points[earlier].x,
                    next.point.y - points[earlier].y) < step * 0.5) return null;
            }
            direction = { x: dx / length, y: dy / length };
            current = next;
            points.push({ ...next.point, _fieldDeviation: true });
        }
        return null;
    }

    function originalContourApproaches(segments, candidates) {
        // Split only the original level set's contact band. Each retained
        // point lies on an original segment; there is no shifted scalar field.
        // The conductor bridges the two approaching branches inside this band.
        const clearance = (point) => Math.min(...candidates.map(({ region }) => (
            roundedRectDistance(point.x, point.y, region) - conductorContactRadius
        )));
        const approaches = [];
        for (const original of joinedContourPolylines(segments)) {
            let current = [];
            const flush = () => {
                if (current.length > 1) {
                    current.sourcePolyline = original;
                    approaches.push(current);
                }
                current = [];
            };
            for (let index = 1; index < original.length; index += 1) {
                const first = original[index - 1];
                const last = original[index];
                const count = Math.max(1, Math.ceil(Math.hypot(last.x - first.x, last.y - first.y) / 1.5));
                let previous = first;
                for (let sample = 1; sample <= count; sample += 1) {
                    const amount = sample / count;
                    const next = { x: first.x + (last.x - first.x) * amount,
                        y: first.y + (last.y - first.y) * amount };
                    const previousOutside = clearance(previous) > 0;
                    const nextOutside = clearance(next) > 0;
                    if (previousOutside && !current.length) current.push(previous);
                    if (previousOutside !== nextOutside) {
                        let low = 0;
                        let high = 1;
                        for (let iteration = 0; iteration < 24; iteration += 1) {
                            const t = (low + high) / 2;
                            const point = { x: previous.x + (next.x - previous.x) * t,
                                y: previous.y + (next.y - previous.y) * t };
                            if ((clearance(point) > 0) === previousOutside) low = t;
                            else high = t;
                        }
                        const t = (low + high) / 2;
                        const boundary = { x: previous.x + (next.x - previous.x) * t,
                            y: previous.y + (next.y - previous.y) * t };
                        current.push(boundary);
                        if (previousOutside) flush();
                    }
                    if (nextOutside) current.push(next);
                    previous = next;
                }
            }
            flush();
        }
        return approaches;
    }

    function repeatedContactCandidates(segments, candidates) {
        if (!candidates.length) return new Set();
        // A single conductor can replace one continuous span of a level set:
        // two approach endpoints, one from each side. More endpoints mean the
        // same contour would leave and re-enter that conductor. Do not fit
        // those branches independently; that creates the visible zig-zags
        // instead of the contour's natural route around the conductor.
        const contactsByRegion = new Map(candidates.map((candidate) => (
            [candidate.regionIndex, 0]
        )));
        for (const approach of originalContourApproaches(segments, candidates)) {
            for (const point of [approach[0], approach.at(-1)]) {
                let nearest = null;
                for (const candidate of candidates) {
                    const distance = Math.abs(
                        roundedRectDistance(point.x, point.y, candidate.region)
                        - conductorContactRadius
                    );
                    if (!nearest || distance < nearest.distance) nearest = { candidate, distance };
                }
                if (nearest && nearest.distance <= 0.01) {
                    contactsByRegion.set(
                        nearest.candidate.regionIndex,
                        contactsByRegion.get(nearest.candidate.regionIndex) + 1
                    );
                }
            }
        }
        return new Set([...contactsByRegion]
            .filter(([, contacts]) => contacts > 2)
            .map(([regionIndex]) => regionIndex));
    }

    function drawParentFittedContours(segments, candidates, parentSegments, adjacentSegments, mesh) {
        const groups = new Map();
        for (const original of originalContourApproaches(segments, candidates)) {
            const source = original.sourcePolyline;
            if (!groups.has(source)) groups.set(source, { source, pieces: [], failed: false });
            const group = groups.get(source);
            const endFit = constrainedParentContactJoin(
                original,
                candidates,
                parentSegments,
                adjacentSegments,
                mesh
            );
            const startFit = constrainedParentContactJoin(
                [...original].reverse(),
                candidates,
                parentSegments,
                adjacentSegments,
                mesh
            );
            const startEnd = startFit.fitStartIndex === undefined
                ? -1 : original.length - 1 - startFit.fitStartIndex;
            const endStart = endFit.fitStartIndex ?? original.length;
            const isContact = (point) => candidates.some(({ region }) => (
                Math.abs(roundedRectDistance(point.x, point.y, region)) <= conductorContactRadius + 0.001
            ));
            if ((isContact(original[0]) && startFit.fitStartIndex === undefined)
                || (isContact(original.at(-1)) && endFit.fitStartIndex === undefined)
                || startEnd >= endStart) group.failed = true;
            // Fit each end against the same original polyline. Never use an
            // already-fitted contact as the source of the opposite approach.
            const points = startEnd < endStart
                ? [
                    ...(startFit.fitStartIndex === undefined ? []
                        : startFit.slice(startFit.fitStartIndex).reverse()),
                    ...original.slice(startEnd + 1, endStart),
                    ...(endFit.fitStartIndex === undefined ? [] : endFit.slice(endFit.fitStartIndex))
                ]
                : original;
            group.pieces.push(points);
        }
        for (const group of groups.values()) {
            for (const points of group.failed ? [group.source] : group.pieces) {
            for (let index = 1; index < points.length; index += 1) {
                context.setTreatment?.(
                    group.failed ? 'conductor-unresolved'
                    : points[index - 1]._fieldDeviation || points[index]._fieldDeviation
                        ? 'contact-fit'
                        : 'conductor-parent'
                );
                context.moveTo(points[index - 1].x, points[index - 1].y);
                context.lineTo(points[index].x, points[index].y);
            }
            }
        }
    }


    function drawContourFamily(
        mesh,
        regions,
        values,
        minimum,
        maximum,
        interval,
        snapValues = []
    ) {
        const { columns, rows, xCoordinates, yCoordinates } = mesh;
        const contactDistance = conductorContactRadius;
        const firstLevel = Math.ceil(minimum / interval) * interval;
        const lastLevel = Math.floor(maximum / interval) * interval;
        if (lastLevel < firstLevel) return;


        const levelCount = Math.round((lastLevel - firstLevel) / interval) + 1;
        const contours = Array.from({ length: levelCount }, (_, index) => ({
            candidates: [],
            level: firstLevel + index * interval,
            segments: []
        }));
        const family = values === mesh.streamValues ? 'streamlines' : 'equipotentials';
        const marchProgressInterval = Math.max(1, Math.ceil(rows / 20));

        profileProgress(`${family}:march:start`, { columns, levels: levelCount, rows });

        // March the mesh once. A cell generally intersects zero or one member
        // of a regularly spaced contour family, so revisiting every cell for
        // every possible level made tall pages hundreds of times slower.
        for (let row = 0; row < rows - 1; row += 1) {
            if (row % marchProgressInterval === 0) {
                profileProgress(`${family}:march:row`, { row, rows });
            }
            for (let column = 0; column < columns - 1; column += 1) {
                const index = row * columns + column;
                const x = xCoordinates[column];
                const nextX = xCoordinates[column + 1];
                const y = yCoordinates[row];
                const nextY = yCoordinates[row + 1];
                const rawTopLeft = values[index];
                const rawTopRight = values[index + 1];
                const rawBottomRight = values[index + columns + 1];
                const rawBottomLeft = values[index + columns];
                const cellMinimum = Math.min(rawTopLeft, rawTopRight, rawBottomRight, rawBottomLeft);
                const cellMaximum = Math.max(rawTopLeft, rawTopRight, rawBottomRight, rawBottomLeft);
                const firstIndex = Math.max(0, Math.ceil((cellMinimum - firstLevel) / interval - 1e-9));
                const lastIndex = Math.min(levelCount - 1, Math.floor((cellMaximum - firstLevel) / interval + 1e-9));

                for (let levelIndex = firstIndex; levelIndex <= lastIndex; levelIndex += 1) {
                    const contour = contours[levelIndex];
                    const regularLevel = contour.level;
                    const topLeft = rawTopLeft - regularLevel;
                    const topRight = rawTopRight - regularLevel;
                    const bottomRight = rawBottomRight - regularLevel;
                    const bottomLeft = rawBottomLeft - regularLevel;
                    const points = [];

                    if ((topLeft < 0) !== (topRight < 0)) points.push(edgePoint(0, topLeft, topRight, x, y, nextX, y));
                    if ((topRight < 0) !== (bottomRight < 0)) points.push(edgePoint(0, topRight, bottomRight, nextX, y, nextX, nextY));
                    if ((bottomLeft < 0) !== (bottomRight < 0)) points.push(edgePoint(0, bottomLeft, bottomRight, x, nextY, nextX, nextY));
                    if ((topLeft < 0) !== (bottomLeft < 0)) points.push(edgePoint(0, topLeft, bottomLeft, x, y, x, nextY));

                    const addSegment = (first, second) => {
                        const segment = clippedSegment(first, second, regions);
                        if (segment) contour.segments.push(segment);
                    };
                    if (points.length === 2) {
                        addSegment(points[0], points[1]);
                    } else if (points.length === 4) {
                        const centerHigh = (topLeft + topRight + bottomRight + bottomLeft) * 0.25 > 0;
                        const pairs = centerHigh ? [[0, 3], [1, 2]] : [[0, 1], [2, 3]];
                        for (const [first, second] of pairs) addSegment(points[first], points[second]);
                    }
                }
            }
        }
        profileProgress(`${family}:march:complete`, {
            levels: levelCount,
            segments: contours.reduce((total, contour) => total + contour.segments.length, 0)
        });

        const approachToRegion = (contour, region) => {
            let best = { distance: Infinity, point: null, tangent: null };
            for (const [start, end] of contour.segments) {
                const length = Math.hypot(end.x - start.x, end.y - start.y);
                const samples = Math.max(1, Math.ceil(length / (contactDistance / 2)));
                for (let sample = 0; sample <= samples; sample += 1) {
                    const t = sample / samples;
                    const x = start.x + (end.x - start.x) * t;
                    const y = start.y + (end.y - start.y) * t;
                    const distance = Math.abs(roundedRectDistance(x, y, region));
                    if (distance < best.distance) {
                        best = {
                            distance,
                            point: { x, y },
                            tangent: { x: end.x - start.x, y: end.y - start.y }
                        };
                    }
                    if (best.distance <= 1e-6) return best;
                }
            }
            return best;
        };
        const distanceToRegion = (contour, region) => approachToRegion(contour, region).distance;

        profileProgress(`${family}:snap:start`, { regions: snapValues.length });
        snapValues.forEach((potential, regionIndex) => {
            if (regionIndex % 10 === 0) {
                profileProgress(`${family}:snap:region`, { region: regionIndex, regions: snapValues.length });
            }
            if (!Number.isFinite(potential)) return;
            const region = regions[regionIndex];
            let nearestContour = null;
            let nearestDistance = Infinity;
            for (const contour of contours) {
                const distance = distanceToRegion(contour, region);
                if (distance >= nearestDistance) continue;
                nearestContour = contour;
                nearestDistance = distance;
            }
            if (nearestContour && nearestDistance <= conductorSnapDistance) {
                nearestContour.candidates.push({
                    potential,
                    region,
                    regionIndex
                });
            }
        });
        profileProgress(`${family}:snap:complete`, { regions: snapValues.length });


        profileProgress(`${family}:draw:start`, { levels: contours.length });
        if (values === mesh.streamValues) mesh.fluxSegments = contours.flatMap(contour => contour.segments);
        for (let contourIndex = 0; contourIndex < contours.length; contourIndex += 1) {
            const contour = contours[contourIndex];
            const repeated = repeatedContactCandidates(contour.segments, contour.candidates);
            if (repeated.size) contactFitStats.repeatedContactRejected += repeated.size;
            // Remove a repeated conductor from the contact solve before any
            // curve fitting. The original contour remains untouched, so a
            // near miss continues around the conductor rather than becoming
            // several separately redirected branches.
            const candidates = contour.candidates.filter((candidate) => !repeated.has(candidate.regionIndex));
            context.setTreatment?.(candidates.length ? 'conductor-parent' : 'none');
            context.beginPath();
            if (candidates.length) {
                const adjacentSegments = [
                    contours[contourIndex - 1]?.segments,
                    contours[contourIndex + 1]?.segments
                ].filter(Boolean);
                drawParentFittedContours(
                    contour.segments,
                    candidates,
                    contour.segments,
                    adjacentSegments,
                    mesh
                );
            } else {
                drawContourSegments(contour.segments);
            }
            if (fieldDebugMode && !context.setTreatment) {
                context.strokeStyle = candidates.length ? '#00c8ff' : 'rgba(0,0,0,0.55)';
                context.lineWidth = candidates.length ? 3 : 1;
            }
            context.stroke();
        }
        profileProgress(`${family}:draw:complete`, { levels: contours.length });
    }

    function drawEquipotentials(mesh, regions, grid, conductorPotentials) {
        drawContourFamily(
            mesh,
            regions,
            mesh.values,
            mesh.minimum,
            mesh.maximum,
            grid * 0.9,
            conductorPotentials
        );
    }

    function boundaryStreamCompression(mesh, row, windowWidth) {
        const offset = row * mesh.columns;
        const cumulativeVariation = new Float64Array(mesh.columns);
        for (let column = 1; column < mesh.columns; column += 1) {
            cumulativeVariation[column] = cumulativeVariation[column - 1] + Math.abs(
                mesh.streamValues[offset + column] - mesh.streamValues[offset + column - 1]
            );
        }

        let maximumCompression = 0;
        let end = 1;
        for (let start = 0; start < mesh.columns - 1; start += 1) {
            end = Math.max(end, start + 1);
            while (
                end < mesh.columns - 1
                && mesh.xCoordinates[end] - mesh.xCoordinates[start] < windowWidth
            ) end += 1;
            const width = mesh.xCoordinates[end] - mesh.xCoordinates[start];
            if (width <= 0) continue;
            const variation = cumulativeVariation[end] - cumulativeVariation[start];
            maximumCompression = Math.max(maximumCompression, variation / width);
        }
        return maximumCompression;
    }

    function streamlineInterval(mesh, grid) {
        // Equal increments of the stream function represent equal flux, but
        // their screen-space spacing contracts where conductors concentrate
        // flux at a page boundary. Measure sustained local compression rather
        // than a whole-edge average, which can hide a dense cluster among
        // sparse margins. The broad window deliberately ignores corner-scale
        // spikes. Only sampling changes: the solved field and its complete
        // stream-function range (including off-screen levels) remain intact.
        const compressionWindow = Math.max(grid * 8, mesh.width * 0.2);
        const topCompression = boundaryStreamCompression(mesh, 0, compressionWindow);
        const bottomCompression = boundaryStreamCompression(mesh, mesh.rows - 1, compressionWindow);
        const boundaryCompression = Math.max(topCompression, bottomCompression);
        const ordinaryCompression = 1.4;
        return grid * Math.max(1, boundaryCompression / ordinaryCompression);
    }

    function drawStreamlines(mesh, regions, fluxPerLine) {
        // A streamline can be absent from both visible horizontal edges yet
        // curve into the viewport from the continuation of those edges beyond
        // the crop. Every such line necessarily has a stream-function value
        // somewhere in the visible exterior domain. Use that complete range
        // for level selection; this restores off-screen seeds without treating
        // the left or right edge as a separate seed source.
        drawContourFamily(
            mesh,
            regions,
            mesh.streamValues,
            mesh.streamMinimum,
            mesh.streamMaximum,
            fluxPerLine
        );
    }

    function drawPotentialDebug(mesh) {
        context.setFillRole?.('potential-debug');
        const stopsFor = (coordinates, targetSize) => {
            const stops = [0];
            let lastCoordinate = coordinates[0];
            for (let index = 1; index < coordinates.length - 1; index += 1) {
                if (coordinates[index] - lastCoordinate < targetSize) continue;
                stops.push(index);
                lastCoordinate = coordinates[index];
            }
            if (stops.at(-1) !== coordinates.length - 1) stops.push(coordinates.length - 1);
            return stops;
        };
        const mix = (first, second, amount) => Math.round(first + (second - first) * amount);
        const colorFor = (value) => {
            const normalized = Math.max(0, Math.min(1, (value - mesh.minimum) / Math.max(mesh.maximum - mesh.minimum, 1e-9)));
            const first = normalized < 0.5 ? [0, 145, 255] : [255, 255, 255];
            const second = normalized < 0.5 ? [255, 255, 255] : [255, 0, 190];
            const amount = normalized < 0.5 ? normalized * 2 : (normalized - 0.5) * 2;
            return `rgba(${mix(first[0], second[0], amount)},${mix(first[1], second[1], amount)},${mix(first[2], second[2], amount)},0.34)`;
        };
        const columnStops = stopsFor(mesh.xCoordinates, 28);
        const rowStops = stopsFor(mesh.yCoordinates, 28);
        for (let rowIndex = 0; rowIndex < rowStops.length - 1; rowIndex += 1) {
            const firstRow = rowStops[rowIndex];
            const nextRow = rowStops[rowIndex + 1];
            const sampleRow = Math.floor((firstRow + nextRow) / 2);
            for (let columnIndex = 0; columnIndex < columnStops.length - 1; columnIndex += 1) {
                const firstColumn = columnStops[columnIndex];
                const nextColumn = columnStops[columnIndex + 1];
                const sampleColumn = Math.floor((firstColumn + nextColumn) / 2);
                context.fillStyle = colorFor(mesh.values[sampleRow * mesh.columns + sampleColumn]);
                context.fillRect(
                    mesh.xCoordinates[firstColumn],
                    mesh.yCoordinates[firstRow],
                    mesh.xCoordinates[nextColumn] - mesh.xCoordinates[firstColumn],
                    mesh.yCoordinates[nextRow] - mesh.yCoordinates[firstRow]
                );
            }
        }
        context.setFillRole?.('none');
    }

    function drawPotentialTint(mesh, conductorPotentials) {
        // The scalar field is deliberately visible, but only just: each
        // solved conductor value is a white stop and the tint peaks halfway
        // between adjacent conductor values. This makes the background read
        // as a continuous potential function without competing with text.
        const levels = [...new Set(conductorPotentials.filter(Number.isFinite))]
            .sort((first, second) => first - second);
        if (!levels.length) return;
        const tintAmount = (value) => {
            if (levels.length === 1) {
                const scale = Math.max(mesh.maximum - mesh.minimum, 1e-9);
                return Math.min(1, Math.abs(value - levels[0]) / (scale * 0.5));
            }
            let index = 0;
            while (index < levels.length - 1 && value > levels[index + 1]) index += 1;
            const lower = levels[index];
            const upper = levels[Math.min(index + 1, levels.length - 1)];
            if (upper === lower) return 0;
            const position = Math.max(0, Math.min(1, (value - lower) / (upper - lower)));
            return Math.sin(Math.PI * position);
        };
        const rasterScale = 4;
        const rasterWidth = Math.max(1, Math.ceil(mesh.width / rasterScale));
        const rasterHeight = Math.max(1, Math.ceil(mesh.height / rasterScale));
        const samplesFor = (coordinates, count, extent) => {
            const samples = [];
            let left = 0;
            for (let index = 0; index < count; index += 1) {
                const coordinate = (index + 0.5) * extent / count;
                while (left < coordinates.length - 2 && coordinates[left + 1] < coordinate) left += 1;
                const right = Math.min(left + 1, coordinates.length - 1);
                const span = Math.max(coordinates[right] - coordinates[left], 1e-9);
                samples.push({ left, right, amount: (coordinate - coordinates[left]) / span });
            }
            return samples;
        };
        const xSamples = samplesFor(mesh.xCoordinates, rasterWidth, mesh.width);
        const ySamples = samplesFor(mesh.yCoordinates, rasterHeight, mesh.height);
        const raster = document.createElement('canvas');
        raster.width = rasterWidth;
        raster.height = rasterHeight;
        const rasterContext = raster.getContext('2d');
        const image = rasterContext.createImageData(rasterWidth, rasterHeight);
        for (let row = 0; row < rasterHeight; row += 1) {
            const y = ySamples[row];
            for (let column = 0; column < rasterWidth; column += 1) {
                const x = xSamples[column];
                const top = mesh.values[y.left * mesh.columns + x.left] * (1 - x.amount)
                    + mesh.values[y.left * mesh.columns + x.right] * x.amount;
                const bottom = mesh.values[y.right * mesh.columns + x.left] * (1 - x.amount)
                    + mesh.values[y.right * mesh.columns + x.right] * x.amount;
                const value = top * (1 - y.amount) + bottom * y.amount;
                const offset = (row * rasterWidth + column) * 4;
                image.data[offset] = 16;
                image.data[offset + 1] = 122;
                image.data[offset + 2] = 193;
                image.data[offset + 3] = Math.round(255 * 0.11 * tintAmount(value));
            }
        }
        rasterContext.putImageData(image, 0, 0);
        if (context.addRasterLayer) {
            context.addRasterLayer(raster.toDataURL('image/png'), mesh.width, mesh.height, 'potential-tint');
        } else {
            context.save();
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            context.drawImage(raster, 0, 0, mesh.width, mesh.height);
            context.restore();
        }
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
            const cornerSpacing = Math.max(8, targetSpacing / 3);
            const count = Math.max(2, Math.ceil(length / cornerSpacing));
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
        const inset = 3;
        context.setTreatment?.('none');
        if (fieldDebugMode && !context.setTreatment) {
            context.strokeStyle = '#111';
            context.lineWidth = 1;
        }
        for (const region of regions) {
            context.beginPath();
            context.setBoundaryRole?.('physical');
            context.roundRect(region.left, region.top, region.right - region.left, region.bottom - region.top, region.radius);
            if (region.right - region.left > inset * 2 && region.bottom - region.top > inset * 2) {
                context.setBoundaryRole?.('decorative-inset');
                context.roundRect(
                    region.left + inset,
                    region.top + inset,
                    region.right - region.left - inset * 2,
                    region.bottom - region.top - inset * 2,
                    Math.max(0, region.radius - inset)
                );
            }
            context.stroke();
        }
    }

    function draw() {
        const startedAt = performance.now();
        resetContactFitStats();
        const styles = getComputedStyle(root);
        const gridToken = styles.getPropertyValue('--grid').trim();
        const rootFontSize = parseFloat(styles.fontSize) || 16;
        const grid = (parseFloat(gridToken) || 1.5) * (gridToken.endsWith('rem') ? rootFontSize : 1);
        const width = Math.max(root.scrollWidth, window.innerWidth);
        const height = Math.max(root.scrollHeight, window.innerHeight);
        const ratio = Math.min(window.devicePixelRatio || 1, width * height > 12000000 ? 1 : 1.5);
        profileProgress('draw:start', { height, ratio, width });

        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        canvas.width = Math.ceil(width * ratio);
        canvas.height = Math.ceil(height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, width, height);
        context.strokeStyle = exportMode ? '#000' : styles.getPropertyValue('--gridline').trim();
        context.lineWidth = 1;

        const regions = getRegions();
        const regionsAt = performance.now();
        profileProgress('regions:complete', { milliseconds: Math.round(regionsAt - startedAt), regions: regions.length });
        profileProgress('solve:start');
        const conductorSolution = solveFloatingConductors(regions, grid, height);
        const solveAt = performance.now();
        profileProgress('solve:complete', { milliseconds: Math.round(solveAt - regionsAt) });
        profileProgress('mesh:start');
        const mesh = buildMesh(width, height, regions, conductorSolution, grid);
        const meshAt = performance.now();
        profileProgress('mesh:timing', { milliseconds: Math.round(meshAt - solveAt) });
        if (fieldDebugMode) drawPotentialDebug(mesh);
        const fluxPerLine = streamlineInterval(mesh, grid);
        context.setFamily?.('streamline');
        drawStreamlines(mesh, regions, fluxPerLine);
        const streamlinesAt = performance.now();
        profileProgress('streamlines:timing', { milliseconds: Math.round(streamlinesAt - meshAt) });
        context.setFamily?.('equipotential');
        drawEquipotentials(
            mesh,
            regions,
            grid,
            conductorSolution.conductorPotentials
        );
        const equipotentialsAt = performance.now();
        profileProgress('equipotentials:timing', { milliseconds: Math.round(equipotentialsAt - streamlinesAt) });
        context.setFamily?.('outline');
        drawRegionContours(regions);
        return {
            contactFits: { ...contactFitStats },
            height,
            timings: {
                equipotentials: equipotentialsAt - streamlinesAt,
                mesh: meshAt - solveAt,
                regions: regionsAt - startedAt,
                solve: solveAt - regionsAt,
                streamlines: streamlinesAt - meshAt,
                total: equipotentialsAt - startedAt
            },
            width
        };
    }

    async function settleLayout() {
        profileProgress('settle:fonts:start');
        await document.fonts?.ready;
        profileProgress('settle:fonts:complete');
        const images = Array.from(document.images);
        if (exportMode) {
            for (const image of images) image.loading = 'eager';
        }
        profileProgress('settle:images:start', {
            images: images.length,
            pending: images.filter((image) => !image.complete).length
        });
        await Promise.all(images.map((image) => new Promise((resolve) => {
            if (image.complete) {
                resolve();
                return;
            }
            let timer = 0;
            const finish = () => {
                clearTimeout(timer);
                image.removeEventListener('load', finish);
                image.removeEventListener('error', finish);
                resolve();
            };
            image.addEventListener('load', finish, { once: true });
            image.addEventListener('error', finish, { once: true });
            timer = window.setTimeout(finish, 10000);
            image.decode().then(finish, finish);
        })));
        profileProgress('settle:images:complete');
        if (window.MathJax?.startup?.promise) await window.MathJax.startup.promise;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        profileProgress('settle:complete');
    }

    if (exportMode) {
        window.__renderComplexGridSvg = async () => {
            await settleLayout();
            context = createSvgContext();
            const dimensions = draw();
            profileProgress('svg:start');
            const svg = context.toSvg(dimensions.width, dimensions.height);
            profileProgress('svg:complete', { bytes: svg.length });
            return {
                ...dimensions,
                svg
            };
        };
    } else {
        const resizeObserver = new ResizeObserver(scheduleDraw);
        resizeObserver.observe(document.body);
        window.addEventListener('resize', scheduleDraw, { passive: true });
        window.addEventListener('load', scheduleDraw, { once: true });
        document.fonts?.ready.then(scheduleDraw);
        scheduleDraw();
    }
})();
