(function () {
    const galleryMount = document.querySelector('[data-redactionbench-gallery]');
    const demoMount = document.querySelector('[data-redactionbench-demo]');
    // Separator punctuation is a boundary, not glue; adjacent whitespace must not chain through it.
    const combinatorExcludedChars = new Set(['\\', '/', '{', '}', '[', ']', '@', '(', ')', '<', '>', "'", '"', '`', ',', ';']);
    const combinatorBarrierChars = new Set([',', ';']);

    const redactionBenchData = globalThis.__REDACTIONBENCH_DATA__ || {};
    const gallerySamples = (redactionBenchData.gallerySamples || []).map(normalizeRecord);
    const demo = normalizeRecord(redactionBenchData.demo || {});
    let redactions = buildInitialRedactions(demo);

    mountGallery();
    mountDemo();

    function buildDemoSample() {
        return cloneRecord(demo);
    }

    function mountGallery() {
        if (!galleryMount) return;
        galleryMount.className = 'rb-sample-browser';
        galleryMount.innerHTML = [
            '<div class="rb-sample-tabs" role="tablist" aria-label="Dataset sample categories">',
            gallerySamples.map((sample, index) => [
                '<button type="button" role="tab" data-gallery-index="' + index + '">',
                '<span class="rb-sample-tab-label">' + escapeHtml(formatLabel(sample.category)) + '</span>',
                '</button>'
            ].join('')).join(''),
            '</div>',
            '<div data-gallery-panel></div>'
        ].join('');

        const panel = galleryMount.querySelector('[data-gallery-panel]');
        const buttons = Array.from(galleryMount.querySelectorAll('[data-gallery-index]'));
        let activeIndex = 0;

        galleryMount.addEventListener('click', (event) => {
            const button = event.target.closest('[data-gallery-index]');
            if (!button) return;
            activeIndex = Number(button.dataset.galleryIndex);
            renderActiveSample();
        });

        renderActiveSample();

        function renderActiveSample() {
            const sample = gallerySamples[activeIndex];
            buttons.forEach((button, index) => {
                const active = index === activeIndex;
                button.setAttribute('aria-selected', active ? 'true' : 'false');
                button.setAttribute('tabindex', active ? '0' : '-1');
            });
            panel.innerHTML = [
                '<article class="rb-sample-card">',
                '<div class="rb-block-heading"><h3>' + escapeHtml(formatSampleId(sample)) + '</h3><span>' + renderSampleProvenance(sample) + '</span></div>',
                renderLegend(false),
                '<div class="rb-doc rb-gallery-doc">' + renderLabeledText(sample.text, sample.hard, sample.displayContextual, sample.combinators) + '</div>',
                '</article>'
            ].join('');
        }
    }

    function formatLabel(value) {
        return String(value).replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
    }

    function formatGenre(value) {
        return formatLabel(String(value).replace(/^_+/, ''));
    }

    function formatSampleId(sample) {
        return 'Category: '
            + String(sample.category || '').replace(/^_+/, '')
            + ', Genre: '
            + String(sample.genre || '').replace(/^_+/, '');
    }

    function renderSampleProvenance(sample) {
        if (sample.source) {
            return '(real:<a href="' + escapeAttribute(sample.source) + '">source</a>)';
        }
        return '(synthetic)';
    }

    function mountDemo() {
        if (!demoMount || !demo.text) return;
        demoMount.className = 'redactionbench-demo';
        demoMount.innerHTML = [
            '<section class="rb-window">',
            renderLegend(true),
            '<div class="rb-doc rb-edit-doc" tabindex="0" data-edit-doc></div>',
            '<div class="rb-readout" data-readout></div>',
            '</section>'
        ].join('');

        const editDoc = demoMount.querySelector('[data-edit-doc]');
        const readoutNode = demoMount.querySelector('[data-readout]');

        editDoc.innerHTML = renderLabeledText(demo.text, demo.hard, demo.displayContextual, demo.combinators);
        renderDemoState();

        editDoc.addEventListener('mouseup', () => redactSelection());
        editDoc.addEventListener('keyup', () => redactSelection());
        window.addEventListener('resize', () => renderRedactionOverlays(editDoc, redactions));

        editDoc.addEventListener('click', (event) => {
            const redaction = event.target.closest('[data-redaction-index]');
            if (!redaction) return;
            removeRedaction(Number(redaction.dataset.redactionIndex));
        });

        editDoc.addEventListener('keydown', (event) => {
            const redaction = event.target.closest('[data-redaction-index]');
            if (!redaction || (event.key !== 'Enter' && event.key !== ' ')) return;
            event.preventDefault();
            removeRedaction(Number(redaction.dataset.redactionIndex));
        });

        function redactSelection() {
            const selection = selectionOffsets(editDoc);
            if (!selection) return;
            redactions = mergeSpans([...redactions, selection]);
            window.getSelection()?.removeAllRanges();
            renderDemoState();
        }

        function removeRedaction(index) {
            if (!Number.isInteger(index)) return;
            redactions = redactions.filter((_span, current) => current !== index);
            renderDemoState();
        }

        function renderDemoState() {
            renderRedactionOverlays(editDoc, redactions);
            const score = scoreSampleEntityIou(demo.hard, redactions, {
                softGoldSpans: demo.contextual,
                text: demo.text
            });
            readoutNode.innerHTML = [
                '<div><strong>' + formatPercent(score.sample_entity_iou) + '</strong><span>R-Score</span></div>',
                '<div><strong>' + formatNumber(score.weighted_connected_iou_numerator) + ' / ' + formatNumber(score.weighted_connected_iou_denominator) + '</strong><span>num / denom</span></div>',
                '<div><strong>' + score.entity_term_count + '</strong><span>red terms</span></div>',
                '<div><strong>' + formatNumber(score.yellow_penalty_denominator_weight) + '</strong><span>context penalty</span></div>',
                '<div><strong>' + formatNumber(score.connected_fp_penalty_denominator_weight) + '</strong><span>FP penalty</span></div>'
            ].join('');
        }
    }

    function renderLegend(includeRedaction) {
        const items = [
            ['legend-red', 'Mandatory', 'must be redacted'],
            ['legend-yellow', 'Contextual', 'depends on document context'],
            ['legend-combinator', 'Combinator', 'connector used for scoring']
        ];
        if (includeRedaction) items.push(['legend-redaction', 'Redaction', 'current redaction span']);
        return [
            '<div class="rb-legend rb-label-legend" aria-label="RedactionBench label legend">',
            items.map(([className, label, description]) => [
                '<span class="' + className + '"><strong>',
                label,
                '</strong> ',
                description,
                '</span>'
            ].join('')).join(''),
            '</div>'
        ].join('');
    }

    function normalizeRecord(record) {
        const source = record || {};
        const contextual = sortedSpans(source.contextual || []);
        return {
            ...source,
            text: String(source.text || ''),
            hard: sortedSpans(source.hard || []),
            contextual,
            displayContextual: sortedSpans(source.displayContextual || contextual),
            combinators: sortedSpans(source.combinators || [])
        };
    }

    function cloneRecord(record) {
        return normalizeRecord({
            ...record,
            hard: record.hard.map((span) => ({ ...span })),
            contextual: record.contextual.map((span) => ({ ...span })),
            displayContextual: record.displayContextual.map((span) => ({ ...span })),
            combinators: record.combinators.map((span) => ({ ...span }))
        });
    }

    function buildInitialRedactions(record) {
        const candidates = [
            ...record.hard.map((span, index) => ({ span, kind: 'hard', index })),
            ...record.contextual.map((span, index) => ({ span, kind: 'contextual', index })),
            ...record.combinators.map((span, index) => ({ span, kind: 'combinator', index }))
        ];
        const selected = candidates.filter(({ span, kind, index }) => {
            const score = deterministicSpanScore(span, kind, index);
            if (kind === 'hard') return score % 5 < 3;
            if (kind === 'contextual') return score % 7 < 2;
            return score % 4 === 0;
        });
        return mergeSpans(selected.map(({ span }) => span));
    }

    function deterministicSpanScore(span, kind, index) {
        let hash = 2166136261;
        const source = kind + ':' + index + ':' + span.start + ':' + span.end;
        for (let offset = 0; offset < source.length; offset += 1) {
            hash ^= source.charCodeAt(offset);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    function renderLabeledText(text, hard, soft, combinators) {
        return renderAnnotatedText(text, hard, soft, combinators);
    }

    function renderRedactionOverlays(root, spans) {
        root.querySelector('.rb-redaction-layer')?.remove();
        const normalized = mergeSpans(spans);
        if (!normalized.length) return;
        const layer = document.createElement('div');
        layer.className = 'rb-redaction-layer';
        layer.style.width = root.scrollWidth + 'px';
        layer.style.height = root.scrollHeight + 'px';
        root.appendChild(layer);
        const rootRect = root.getBoundingClientRect();
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        const expandX = rem * 0.14;
        const expandY = rem * 0.06;
        normalized.forEach((span, index) => {
            const range = rangeForOffsets(root, span.start, span.end);
            if (!range) return;
            mergedLineRects(range.getClientRects()).forEach((rect, rectIndex) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'rb-redaction-overlay';
                button.dataset.redactionIndex = String(index);
                button.setAttribute('aria-label', 'Remove redaction');
                if (rectIndex > 0) button.tabIndex = -1;
                button.style.left = (rect.left - rootRect.left + root.scrollLeft - expandX) + 'px';
                button.style.top = (rect.top - rootRect.top + root.scrollTop - expandY) + 'px';
                button.style.width = (rect.width + expandX * 2) + 'px';
                button.style.height = (rect.height + expandY * 2) + 'px';
                layer.appendChild(button);
            });
        });
    }

    function mergedLineRects(rectList) {
        const rects = Array.from(rectList)
            .filter((rect) => rect.width > 0 && rect.height > 0)
            .sort((left, right) => left.top - right.top || left.left - right.left);
        const groups = [];
        rects.forEach((rect) => {
            const centerY = rect.top + rect.height / 2;
            const group = groups.find((candidate) => centerY >= candidate.top - 2 && centerY <= candidate.bottom + 2);
            if (!group) {
                groups.push({
                    top: rect.top,
                    bottom: rect.bottom,
                    left: rect.left,
                    right: rect.right
                });
                return;
            }
            group.top = Math.min(group.top, rect.top);
            group.bottom = Math.max(group.bottom, rect.bottom);
            group.left = Math.min(group.left, rect.left);
            group.right = Math.max(group.right, rect.right);
        });
        return groups
            .sort((left, right) => left.top - right.top || left.left - right.left)
            .map((rect) => ({
                top: rect.top,
                left: rect.left,
                width: rect.right - rect.left,
                height: rect.bottom - rect.top
            }));
    }

    function rangeForOffsets(root, start, end) {
        const textNodes = textNodesFor(root);
        let cursor = 0;
        let startNode = null;
        let startOffset = 0;
        let endNode = null;
        let endOffset = 0;
        for (const node of textNodes) {
            const next = cursor + node.nodeValue.length;
            if (!startNode && start >= cursor && start <= next) {
                startNode = node;
                startOffset = start - cursor;
            }
            if (!endNode && end >= cursor && end <= next) {
                endNode = node;
                endOffset = end - cursor;
                break;
            }
            cursor = next;
        }
        if (!startNode || !endNode) return null;
        const range = document.createRange();
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);
        return range;
    }

    function textNodesFor(root) {
        const nodes = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                return node.parentElement?.closest('.rb-redaction-layer')
                    ? NodeFilter.FILTER_REJECT
                    : NodeFilter.FILTER_ACCEPT;
            }
        });
        while (walker.nextNode()) nodes.push(walker.currentNode);
        return nodes;
    }

    function renderAnnotatedText(text, hard, soft, combinators) {
        let html = '';
        const points = boundaries(text, [hard, soft, combinators]);
        let previousLabelClass = '';
        let previousLabelEnd = -1;
        let sameLabelRunIndex = 0;
        for (let index = 0; index < points.length - 1; index += 1) {
            const start = points[index];
            const end = points[index + 1];
            if (end <= start) continue;
            const labelClass = labelClassForInterval(hard, soft, combinators, start, end);
            const escaped = escapeHtml(text.slice(start, end));
            if (!labelClass) {
                html += escaped;
                continue;
            }
            if (labelClass === previousLabelClass && start === previousLabelEnd) {
                sameLabelRunIndex += 1;
            } else {
                sameLabelRunIndex = 0;
            }
            previousLabelClass = labelClass;
            previousLabelEnd = end;
            const altClass = sameLabelRunIndex % 2 === 0 ? 'rb-alt-a' : 'rb-alt-b';
            html += '<span class="' + labelClass + ' ' + altClass + '">' + escaped + '</span>';
        }
        return html;
    }

    function labelClassForInterval(hard, soft, combinators, start, end) {
        if (combinators.some((span) => overlaps(span, start, end))) return 'rb-combinator';
        if (hard.some((span) => overlaps(span, start, end))) return 'rb-mandatory';
        if (soft.some((span) => overlaps(span, start, end))) return 'rb-contextual';
        return '';
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"]/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;'
        })[char]);
    }

    function escapeAttribute(value) {
        return escapeHtml(value).replace(/'/g, '&#39;');
    }

    function normalizeSpans(spans, textLen) {
        if (!Array.isArray(spans)) return [];
        const out = [];
        const hasTextLen = Number.isFinite(Number(textLen));
        const limit = hasTextLen ? Math.max(0, Number(textLen)) : null;
        for (const span of spans) {
            let start;
            let end;
            if (Array.isArray(span)) {
                [start, end] = span;
            } else if (span && typeof span === 'object') {
                ({ start, end } = span);
            } else {
                continue;
            }
            if (start === undefined || end === undefined) continue;
            let s = Number(start);
            let e = Number(end);
            if (!Number.isFinite(s) || !Number.isFinite(e)) continue;
            s = Math.trunc(s);
            e = Math.trunc(e);
            if (hasTextLen) {
                s = Math.max(0, Math.min(s, limit));
                e = Math.max(0, Math.min(e, limit));
            } else {
                s = Math.max(0, s);
                e = Math.max(0, e);
            }
            if (e > s) out.push({ start: s, end: e });
        }
        return out;
    }

    function sortedSpans(spans) {
        return normalizeSpans(spans).sort((left, right) => left.start - right.start || left.end - right.end);
    }

    function uniqueSortedSpans(spans) {
        const seen = new Set();
        const out = [];
        for (const span of sortedSpans(spans)) {
            const key = spanKey(span);
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(span);
        }
        return out;
    }

    function mergeSpans(spans) {
        const ordered = sortedSpans(spans);
        if (!ordered.length) return [];
        const out = [{ ...ordered[0] }];
        for (const span of ordered.slice(1)) {
            const previous = out[out.length - 1];
            if (span.start <= previous.end) previous.end = Math.max(previous.end, span.end);
            else out.push({ ...span });
        }
        return out;
    }

    function stripSpanWhitespace(text, spans) {
        const src = String(text);
        const out = [];
        for (const span of normalizeSpans(spans, src.length)) {
            let start = span.start;
            let end = span.end;
            while (start < end && /\s/.test(src[start])) start += 1;
            while (end > start && /\s/.test(src[end - 1])) end -= 1;
            if (end > start) out.push({ start, end });
        }
        return normalizeSpans(out, src.length);
    }

    function spanKey(span) {
        return String(Number(span.start)) + ':' + String(Number(span.end));
    }

    function spanFromKey(key) {
        const [start, end] = String(key).split(':').map(Number);
        return { start, end };
    }

    function spansEqual(left, right) {
        return Number(left.start) === Number(right.start) && Number(left.end) === Number(right.end);
    }

    function spanToken(text, span) {
        if (text == null) return '';
        const start = Number(span.start);
        const end = Number(span.end);
        if (start < 0 || end > text.length || end <= start) return '';
        return String(text.slice(start, end));
    }

    function isNumericToken(token) {
        return String(token).length > 0 && /^[0-9]+$/.test(String(token));
    }

    function isSingleNonAlnumCharSpan(text, span) {
        if (text == null) return false;
        const start = Number(span.start);
        const end = Number(span.end);
        if (end - start !== 1) return false;
        if (start < 0 || end > text.length) return false;
        const token = text.slice(start, end);
        if (combinatorExcludedChars.has(token)) return false;
        return !/[0-9A-Za-z]/.test(token);
    }

    function canNeighborCombinator(text, span) {
        const token = spanToken(text, span);
        return token.length !== 1 || !combinatorBarrierChars.has(token);
    }

    function mapPush(map, key, value) {
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(value);
    }

    function disjointSet(size) {
        const parent = Array.from({ length: size }, (_value, index) => index);
        function find(index) {
            let current = index;
            while (parent[current] !== current) {
                parent[current] = parent[parent[current]];
                current = parent[current];
            }
            return current;
        }
        function union(left, right) {
            const leftRoot = find(left);
            const rightRoot = find(right);
            if (leftRoot !== rightRoot) parent[rightRoot] = leftRoot;
        }
        return { find, union };
    }

    function combinatorSoftSpans(hardGoldSpans, softGoldSpans, text) {
        const hard = sortedSpans(hardGoldSpans);
        const soft = sortedSpans(softGoldSpans);
        if (!soft.length || text == null) return [];
        const allGold = [...hard, ...soft];
        const starts = new Map();
        const ends = new Map();
        allGold.forEach((span, index) => {
            mapPush(starts, span.start, index);
            mapPush(ends, span.end, index);
        });
        const out = [];
        const softOffset = hard.length;
        soft.forEach((softSpan, softIndex) => {
            if (!isSingleNonAlnumCharSpan(text, softSpan)) return;
            const nodeIndex = softOffset + softIndex;
            const leftNodes = (ends.get(softSpan.start) || [])
                .filter((index) => index !== nodeIndex && canNeighborCombinator(text, allGold[index]));
            const rightNodes = (starts.get(softSpan.end) || [])
                .filter((index) => index !== nodeIndex && canNeighborCombinator(text, allGold[index]));
            if (leftNodes.length && rightNodes.length) out.push({ ...softSpan });
        });
        return out;
    }

    function redFusionGroups(hardGoldSpans, softGoldSpans, text) {
        const hard = sortedSpans(hardGoldSpans);
        const soft = sortedSpans(softGoldSpans);
        if (!hard.length) return [];
        const allGold = [...hard, ...soft];
        const dsu = disjointSet(allGold.length);
        const starts = new Map();
        const ends = new Map();
        allGold.forEach((span, index) => {
            mapPush(starts, span.start, index);
            mapPush(ends, span.end, index);
        });
        const softOffset = hard.length;
        soft.forEach((softSpan, softIndex) => {
            if (!isSingleNonAlnumCharSpan(text, softSpan)) return;
            const nodeIndex = softOffset + softIndex;
            const leftNodes = (ends.get(softSpan.start) || [])
                .filter((index) => index !== nodeIndex && canNeighborCombinator(text, allGold[index]));
            const rightNodes = (starts.get(softSpan.end) || [])
                .filter((index) => index !== nodeIndex && canNeighborCombinator(text, allGold[index]));
            if (!leftNodes.length || !rightNodes.length) return;
            leftNodes.forEach((left) => rightNodes.forEach((right) => dsu.union(left, right)));
        });
        const grouped = new Map();
        hard.forEach((_span, hardIndex) => mapPush(grouped, dsu.find(hardIndex), hardIndex));
        return Array.from(grouped.values())
            .filter(Boolean)
            .sort((left, right) => hard[left[0]].start - hard[right[0]].start);
    }

    function yellowCombinatorComponents(redGoldSpans, yellowGoldSpans, text) {
        const red = sortedSpans(redGoldSpans);
        const yellow = sortedSpans(yellowGoldSpans);
        if (!yellow.length || text == null) return { components: [], pairRanges: [], effectiveMarkers: [] };

        const allSpans = [...red, ...yellow];
        const yellowKeys = new Set(yellow.map(spanKey));
        const spanToIndex = new Map(allSpans.map((span, index) => [spanKey(span), index]));
        const starts = new Map();
        const ends = new Map();
        allSpans.forEach((span) => {
            mapPush(starts, span.start, span);
            mapPush(ends, span.end, span);
        });
        for (const [key, values] of starts.entries()) starts.set(key, values.sort((left, right) => left.start - right.start || left.end - right.end));
        for (const [key, values] of ends.entries()) ends.set(key, values.sort((left, right) => left.start - right.start || left.end - right.end));

        const edgePairs = new Set();
        const effectiveMarkers = new Set();
        function addEdges(leftSpans, rightSpans) {
            leftSpans.forEach((left) => {
                const leftIndex = spanToIndex.get(spanKey(left));
                if (leftIndex == null) return;
                rightSpans.forEach((right) => {
                    const rightIndex = spanToIndex.get(spanKey(right));
                    if (rightIndex == null || rightIndex === leftIndex) return;
                    const lo = Math.min(leftIndex, rightIndex);
                    const hi = Math.max(leftIndex, rightIndex);
                    edgePairs.add(lo + ':' + hi);
                });
            });
        }

        combinatorSoftSpans(red, yellow, text).forEach((comb) => {
            effectiveMarkers.add(spanKey(comb));
            const lefts = (ends.get(comb.start) || []).filter((span) => !spansEqual(span, comb));
            const rights = (starts.get(comb.end) || []).filter((span) => !spansEqual(span, comb));
            addEdges(lefts, rights);
            addEdges(lefts, [comb]);
            addEdges([comb], rights);
        });

        yellow.forEach((span) => {
            if (spanToken(text, span) !== '/') return;
            const lefts = (ends.get(span.start) || []).filter((item) => !spansEqual(item, span));
            const rights = (starts.get(span.end) || []).filter((item) => !spansEqual(item, span));
            if (!lefts.length || !rights.length) return;
            if (!lefts.some((item) => isNumericToken(spanToken(text, item)))) return;
            if (!rights.some((item) => isNumericToken(spanToken(text, item)))) return;
            effectiveMarkers.add(spanKey(span));
            addEdges(lefts, rights);
            addEdges(lefts, [span]);
            addEdges([span], rights);
        });

        const closeTokens = new Set([')', ']', '}']);
        yellow.forEach((closeSpan) => {
            if (!closeTokens.has(spanToken(text, closeSpan))) return;
            let cursor = closeSpan.end;
            let sawSpace = false;
            while (true) {
                const spaceSpans = (starts.get(cursor) || []).filter((item) => /^\s+$/.test(spanToken(text, item)));
                if (!spaceSpans.length) break;
                sawSpace = true;
                cursor = Math.max(...spaceSpans.map((item) => item.end));
            }
            if (!sawSpace) return;
            const lefts = (ends.get(closeSpan.start) || []).filter((item) => !spansEqual(item, closeSpan));
            const rights = starts.get(cursor) || [];
            const bridgeSpans = [closeSpan];
            effectiveMarkers.add(spanKey(closeSpan));
            yellow.forEach((spaceSpan) => {
                if (spaceSpan.start >= closeSpan.end && spaceSpan.end <= cursor && /^\s+$/.test(spanToken(text, spaceSpan))) {
                    effectiveMarkers.add(spanKey(spaceSpan));
                    bridgeSpans.push(spaceSpan);
                }
            });
            addEdges(lefts, rights);
            addEdges(lefts, bridgeSpans);
            addEdges(bridgeSpans, rights);
        });

        const dsu = disjointSet(allSpans.length);
        edgePairs.forEach((key) => {
            const [left, right] = key.split(':').map(Number);
            dsu.union(left, right);
        });
        const comps = new Map();
        allSpans.forEach((span, index) => {
            if (!yellowKeys.has(spanKey(span))) return;
            const root = dsu.find(index);
            if (!comps.has(root)) comps.set(root, new Map());
            comps.get(root).set(spanKey(span), span);
        });
        const components = Array.from(comps.values()).map((map) => Array.from(map.values()));

        const pairOpenToClose = { '(': ')', '[': ']', '{': '}', '<': '>' };
        const pairCloseToOpen = { ')': '(', ']': '[', '}': '{', '>': '<' };
        const selfDelimiters = new Set(["'", '"', '`']);
        const openStacks = { '(': [], '[': [], '{': [], '<': [] };
        const selfStacks = { "'": [], '"': [], '`': [] };
        const pairRanges = [];
        yellow.forEach((span, index) => {
            const token = spanToken(text, span);
            if (token.length !== 1) return;
            if (selfDelimiters.has(token)) {
                const stack = selfStacks[token];
                if (stack.length) {
                    const openIndex = stack.pop();
                    const lo = Math.min(openIndex, index);
                    const hi = Math.max(openIndex, index);
                    const enclosed = yellow.slice(lo, hi + 1);
                    effectiveMarkers.add(spanKey(yellow[openIndex]));
                    effectiveMarkers.add(spanKey(span));
                    pairRanges.push({ openSpan: yellow[openIndex], closeSpan: span, enclosed });
                } else {
                    stack.push(index);
                }
                return;
            }
            if (Object.prototype.hasOwnProperty.call(pairOpenToClose, token)) {
                openStacks[token].push(index);
                return;
            }
            if (!Object.prototype.hasOwnProperty.call(pairCloseToOpen, token)) return;
            const openToken = pairCloseToOpen[token];
            const stack = openStacks[openToken] || [];
            if (!stack.length) return;
            const openIndex = stack.pop();
            const lo = Math.min(openIndex, index);
            const hi = Math.max(openIndex, index);
            const enclosed = yellow.slice(lo, hi + 1);
            effectiveMarkers.add(spanKey(yellow[openIndex]));
            effectiveMarkers.add(spanKey(span));
            pairRanges.push({ openSpan: yellow[openIndex], closeSpan: span, enclosed });
        });

        const effectiveMarkerSpans = Array.from(effectiveMarkers).map(spanFromKey).sort((left, right) => left.start - right.start || left.end - right.end);
        return { components, pairRanges, effectiveMarkers: effectiveMarkerSpans };
    }

    function effectiveYellowCombinatorSpans(redGoldSpans, yellowGoldSpans, text) {
        return yellowCombinatorComponents(redGoldSpans, yellowGoldSpans, text).effectiveMarkers;
    }

    function yellowFusionGroups(redGoldSpans, yellowGoldSpans, text) {
        const yellow = sortedSpans(yellowGoldSpans);
        if (!yellow.length) return [];
        const dsu = disjointSet(yellow.length);
        const spanToIndex = new Map(yellow.map((span, index) => [spanKey(span), index]));
        const { components, pairRanges, effectiveMarkers } = yellowCombinatorComponents(redGoldSpans, yellow, text);
        const effectiveMarkerSet = new Set(effectiveMarkers.map(spanKey));
        components.forEach((component) => {
            const indices = component.map((span) => spanToIndex.get(spanKey(span))).filter((index) => index != null);
            indices.slice(1).forEach((index) => dsu.union(indices[0], index));
        });
        pairRanges.forEach((range) => {
            const indices = range.enclosed.map((span) => spanToIndex.get(spanKey(span))).filter((index) => index != null);
            indices.slice(1).forEach((index) => dsu.union(indices[0], index));
        });
        const grouped = new Map();
        yellow.forEach((_span, index) => mapPush(grouped, dsu.find(index), index));
        return Array.from(grouped.values())
            .filter((indices) => indices.length && !(indices.length === 1 && effectiveMarkerSet.has(spanKey(yellow[indices[0]]))))
            .sort((left, right) => yellow[left[0]].start - yellow[right[0]].start);
    }

    function yellowRequiredSpansForTarget(targetRed, targetYellow, predMerged, text) {
        const yellow = sortedSpans(targetYellow);
        const touched = new Map();
        yellow.forEach((span) => touched.set(spanKey(span), adjacentSpans(predMerged, span).length > 0));
        const { components, pairRanges } = yellowCombinatorComponents(targetRed, yellow, text);
        const required = new Set();
        components.forEach((component) => {
            if (component.some((span) => touched.get(spanKey(span)))) {
                component.forEach((span) => required.add(spanKey(span)));
            }
        });
        pairRanges.forEach((range) => {
            if (touched.get(spanKey(range.openSpan)) || touched.get(spanKey(range.closeSpan))) {
                range.enclosed.forEach((span) => required.add(spanKey(span)));
            }
        });
        let changed = true;
        while (changed) {
            changed = false;
            components.forEach((component) => {
                if (component.some((span) => required.has(spanKey(span))) && component.some((span) => !required.has(spanKey(span)))) {
                    component.forEach((span) => required.add(spanKey(span)));
                    changed = true;
                }
            });
            pairRanges.forEach((range) => {
                const shouldRequire = required.has(spanKey(range.openSpan))
                    || required.has(spanKey(range.closeSpan))
                    || touched.get(spanKey(range.openSpan))
                    || touched.get(spanKey(range.closeSpan));
                if (shouldRequire && range.enclosed.some((span) => !required.has(spanKey(span)))) {
                    range.enclosed.forEach((span) => required.add(spanKey(span)));
                    changed = true;
                }
            });
        }
        return { touched, required };
    }

    function buildGoldRedactionTargets(hardGoldSpans, softGoldSpans, text) {
        const hard = uniqueSortedSpans(hardGoldSpans);
        const soft = uniqueSortedSpans(softGoldSpans);
        const combinatorSoft = combinatorSoftSpans(hard, soft, text);
        const allGold = [...hard, ...soft];
        const allGoldIsRed = [...hard.map(() => true), ...soft.map(() => false)];
        if (!allGold.length) return { targets: [], allGold: [], allGoldIsRed: [], combinatorSoft };
        const dsu = disjointSet(allGold.length);
        for (let left = 0; left < allGold.length; left += 1) {
            for (let right = left + 1; right < allGold.length; right += 1) {
                if (spansIntersectOrTouch(allGold[left], allGold[right])) dsu.union(left, right);
            }
        }
        const grouped = new Map();
        allGold.forEach((span, index) => {
            const root = dsu.find(index);
            if (!grouped.has(root)) grouped.set(root, { reds: [], yellows: [] });
            grouped.get(root)[allGoldIsRed[index] ? 'reds' : 'yellows'].push(span);
        });
        const targets = Array.from(grouped.values())
            .filter((group) => group.reds.length || group.yellows.length)
            .map((group) => ({
                reds: sortedSpans(group.reds),
                yellows: sortedSpans(group.yellows)
            }))
            .sort((left, right) => {
                const leftStarts = [...left.reds, ...left.yellows].map((span) => span.start);
                const rightStarts = [...right.reds, ...right.yellows].map((span) => span.start);
                return Math.min(...leftStarts) - Math.min(...rightStarts);
            });
        const targetSpans = [];
        const targetIsRed = [];
        targets.forEach((target) => {
            target.reds.forEach((span) => {
                targetSpans.push(span);
                targetIsRed.push(true);
            });
            target.yellows.forEach((span) => {
                targetSpans.push(span);
                targetIsRed.push(false);
            });
        });
        return { targets, allGold: targetSpans, allGoldIsRed: targetIsRed, combinatorSoft };
    }

    function buildConnectedComponents(goldSpans, predSpans) {
        const gold = normalizeSpans(goldSpans);
        const pred = normalizeSpans(predSpans);
        const nGold = gold.length;
        const nPred = pred.length;
        if (nGold === 0 && nPred === 0) return [];
        const dsu = disjointSet(nGold + nPred);
        const predSorted = pred.map((span, index) => ({ span, index })).sort((left, right) => left.span.start - right.span.start || left.span.end - right.span.end);
        let predCursor = 0;
        let activePreds = [];
        gold.map((span, index) => ({ span, index }))
            .sort((left, right) => left.span.start - right.span.start || left.span.end - right.span.end)
            .forEach(({ span: goldSpan, index: goldIndex }) => {
                while (predCursor < nPred && predSorted[predCursor].span.start < goldSpan.end) {
                    activePreds.push(predSorted[predCursor]);
                    predCursor += 1;
                }
                if (!activePreds.length) return;
                const nextActive = [];
                activePreds.forEach(({ span: predSpan, index: predIndex }) => {
                    if (predSpan.end <= goldSpan.start) return;
                    if (spansIntersect(goldSpan, predSpan)) dsu.union(goldIndex, nGold + predIndex);
                    nextActive.push({ span: predSpan, index: predIndex });
                });
                activePreds = nextActive;
            });
        const byRoot = new Map();
        for (let goldIndex = 0; goldIndex < nGold; goldIndex += 1) {
            const root = dsu.find(goldIndex);
            if (!byRoot.has(root)) byRoot.set(root, { gold: [], pred: [] });
            byRoot.get(root).gold.push(goldIndex);
        }
        for (let predIndex = 0; predIndex < nPred; predIndex += 1) {
            const root = dsu.find(nGold + predIndex);
            if (!byRoot.has(root)) byRoot.set(root, { gold: [], pred: [] });
            byRoot.get(root).pred.push(predIndex);
        }
        return Array.from(byRoot.values());
    }

    function connectedFpSpanWeight(fpSpan, componentGoldSpans) {
        const fpStart = fpSpan.start;
        const fpEnd = fpSpan.end;
        if (fpEnd <= fpStart) return 0;
        const fpLen = fpEnd - fpStart;
        const goldMerged = mergeSpans(componentGoldSpans);
        const hasLeftGoldBoundary = goldMerged.some((span) => span.end === fpStart);
        const hasRightGoldBoundary = goldMerged.some((span) => span.start === fpEnd);
        return hasLeftGoldBoundary && hasRightGoldBoundary && fpLen >= 3 ? 2 : 1;
    }

    function coverageMetricsForFusedEntities(fusedEntities, predUnion, prefix) {
        const predMerged = mergeSpans(predUnion);
        const entityCount = fusedEntities.length;
        let coverageSum = 0;
        const thresholds = [
            ['coverage_p50', 0.5],
            ['coverage_p80', 0.8],
            ['coverage_p90', 0.9],
            ['coverage_p95', 0.95]
        ];
        const thresholdHits = Object.fromEntries(thresholds.map(([key]) => [key, 0]));
        fusedEntities.forEach((atomicSpans) => {
            const entityMerged = mergeSpans(atomicSpans);
            const entityLen = spanLength(entityMerged);
            if (entityLen <= 0) return;
            const coverage = intersectionLengthMerged(entityMerged, predMerged) / entityLen;
            coverageSum += coverage;
            thresholds.forEach(([key, threshold]) => {
                if (coverage >= threshold) thresholdHits[key] += 1;
            });
        });
        const out = {};
        out[prefix + '_entity_count'] = entityCount;
        out[prefix + '_mean_entity_coverage_numerator'] = coverageSum;
        out[prefix + '_mean_entity_coverage'] = entityCount <= 0 ? 1 : safeRate(coverageSum, entityCount);
        thresholds.forEach(([key]) => {
            out[prefix + '_' + key + '_numerator'] = thresholdHits[key];
            out[prefix + '_' + key] = entityCount <= 0 ? 1 : safeRate(thresholdHits[key], entityCount);
        });
        return out;
    }

    function predictionEntityScore(predSpan, componentRedSpans, componentYellowSpans) {
        const predEffective = subtractSpansMerged([predSpan], componentYellowSpans);
        if (!predEffective.length || !componentRedSpans.length) return 0;
        const predEffectiveLen = spanLength(predEffective);
        let best = 0;
        const redSorted = sortedSpans(componentRedSpans);
        let redIndex = 0;
        predEffective.forEach((pred) => {
            while (redIndex < redSorted.length && redSorted[redIndex].end <= pred.start) redIndex += 1;
            let checkIndex = redIndex;
            while (checkIndex < redSorted.length && redSorted[checkIndex].start < pred.end) {
                const red = redSorted[checkIndex];
                const inter = Math.max(0, Math.min(pred.end, red.end) - Math.max(pred.start, red.start));
                if (inter > 0) {
                    const union = predEffectiveLen + (red.end - red.start) - inter;
                    if (union > 0) best = Math.max(best, inter / union);
                }
                checkIndex += 1;
            }
        });
        return best;
    }

    function predSpanQualityStats(goldSpans, predSpans) {
        const gold = normalizeSpans(goldSpans);
        const pred = normalizeSpans(predSpans);
        if (!pred.length) return { pred_span_count: 0, exact_pred_span_count: 0, exact_span_rate: 0 };
        const goldExact = new Set(gold.map(spanKey));
        const exact = pred.filter((span) => goldExact.has(spanKey(span))).length;
        return { pred_span_count: pred.length, exact_pred_span_count: exact, exact_span_rate: safeRate(exact, pred.length) };
    }

    function goldSpanFnStats(goldSpans, predSpans) {
        const gold = normalizeSpans(goldSpans);
        if (!gold.length) return { gold_span_total: 0, false_negative_gold_span_count: 0, false_negative_rate: 0 };
        const fn = countNonIntersectingSpans(gold, predSpans);
        return { gold_span_total: gold.length, false_negative_gold_span_count: fn, false_negative_rate: safeRate(fn, gold.length) };
    }

    function connectedEntityMetrics(hardGoldSpans, predSpans, options) {
        const text = options?.text ?? null;
        const allowOptionalYellowTermsWhenNoRed = options?.allowOptionalYellowTermsWhenNoRed ?? true;
        const hard = sortedSpans(hardGoldSpans);
        const soft = sortedSpans(options?.softGoldSpans || []);
        const pred = normalizeSpans(predSpans);
        const { targets, allGold, allGoldIsRed, combinatorSoft } = buildGoldRedactionTargets(hard, soft, text);
        const hardCount = hard.length;
        const softCount = soft.length;
        const components = buildConnectedComponents(allGold, pred);
        const scoringTerms = [];
        const entityTermScores = [];
        const predictionTermScores = [];
        const componentIous = [];
        const componentRedCounts = [];
        const componentYellowCounts = [];
        let unforgivableYellowComponentCount = 0;
        let predOnlyPenaltyTermCount = 0;
        let yellowPenaltyTermCount = 0;
        let yellowPenaltyDenominatorWeight = 0;
        let connectedFpPenaltyTermCount = 0;
        let connectedFpPenaltyDenominatorWeight = 0;
        let truePositivePredictionCount = 0;
        let falsePositivePredictionCount = 0;
        let falseNegativeEntityCount = 0;
        let fusedYellowEntityCount = 0;

        const predMerged = mergeSpans(pred);
        const atomicRedScores = hard.map(() => 0);
        const allGoldMerged = mergeSpans([...hard, ...soft]);
        hard.forEach((currentRed, hardIndex) => {
            const forgivenessMerged = mergeSpans([...hard, ...soft].filter((span) => !spansEqual(span, currentRed)));
            const currentRedEffective = subtractSpansMerged([currentRed], forgivenessMerged);
            const predAdjacent = adjacentSpans(predMerged, currentRed);
            const predAdjacentMerged = mergeSpans(predAdjacent);
            const predOnGold = intersectSpans(predAdjacentMerged, allGoldMerged);
            const predAdjacentEffective = subtractSpansMerged(predOnGold, forgivenessMerged);
            atomicRedScores[hardIndex] = iouMerged(currentRedEffective, predAdjacentEffective);
        });

        const fusionGroups = redFusionGroups(hard, soft, text);
        const fusedRedEntities = fusionGroups.map((group) => group.map((index) => hard[index]));
        fusionGroups.forEach((group) => {
            const terms = group.map((index) => atomicRedScores[index]);
            const groupTerm = terms.length ? terms.reduce((sum, value) => sum + value, 0) / terms.length : 0;
            entityTermScores.push(groupTerm);
            scoringTerms.push(groupTerm);
            if (groupTerm <= 0) falseNegativeEntityCount += 1;
        });

        const hasRedInSample = hardCount > 0;
        const fusedYellowEntities = [];
        targets.forEach((target) => {
            const targetRed = normalizeSpans(target.reds || []);
            const targetYellow = normalizeSpans(target.yellows || []);
            const targetAll = [...targetRed, ...targetYellow];
            const { required: yellowRequired } = yellowRequiredSpansForTarget(targetRed, targetYellow, predMerged, text);
            const yellowGroups = yellowFusionGroups(targetRed, targetYellow, text);
            fusedYellowEntityCount += yellowGroups.length;
            yellowGroups.forEach((group) => fusedYellowEntities.push(group.map((index) => targetYellow[index])));

            const yellowScoresBySpan = new Map();
            targetYellow.forEach((currentYellow) => {
                const touchedPred = adjacentSpans(predMerged, currentYellow);
                const currentKey = spanKey(currentYellow);
                if (!touchedPred.length && !yellowRequired.has(currentKey)) return;
                const touchedPredMerged = mergeSpans(touchedPred);
                const forgivenessMerged = mergeSpans(targetAll.filter((span) => !spansEqual(span, currentYellow)));
                const yellowEffective = subtractSpansMerged([currentYellow], forgivenessMerged);
                let touchedEffective = subtractSpansMerged(touchedPredMerged, forgivenessMerged);
                if (hasRedInSample) {
                    const localFpOvercover = subtractSpansMerged(touchedPredMerged, mergeSpans(targetAll));
                    touchedEffective = subtractSpansMerged(touchedEffective, localFpOvercover);
                }
                yellowScoresBySpan.set(currentKey, iouMerged(yellowEffective, touchedEffective));
            });
            if (!yellowScoresBySpan.size) return;

            const targetYellowEntityScores = [];
            const targetYellowNonperfectScores = [];
            const targetYellowPenaltyWeights = [];
            yellowGroups.forEach((group) => {
                const groupScores = group
                    .map((index) => yellowScoresBySpan.get(spanKey(targetYellow[index])))
                    .filter((value) => value !== undefined);
                if (!groupScores.length) return;
                const groupScore = groupScores.reduce((sum, value) => sum + value, 0) / groupScores.length;
                targetYellowEntityScores.push(groupScore);
                const penaltyWeight = Math.max(0, 1 - groupScore);
                targetYellowPenaltyWeights.push(penaltyWeight);
                if (penaltyWeight > 1e-12) targetYellowNonperfectScores.push(groupScore);
            });

            if (!hasRedInSample && allowOptionalYellowTermsWhenNoRed) {
                targetYellowEntityScores.forEach((score) => scoringTerms.push(score));
                if (targetYellowNonperfectScores.length) {
                    yellowPenaltyTermCount += targetYellowNonperfectScores.length;
                    unforgivableYellowComponentCount += 1;
                }
                return;
            }
            if (hasRedInSample && targetYellowNonperfectScores.length) {
                yellowPenaltyTermCount += targetYellowNonperfectScores.length;
                unforgivableYellowComponentCount += 1;
                yellowPenaltyDenominatorWeight += targetYellowPenaltyWeights.reduce((sum, value) => sum + value, 0);
                return;
            }
            if (!hasRedInSample && targetYellowNonperfectScores.length) {
                yellowPenaltyTermCount += targetYellowNonperfectScores.length;
                unforgivableYellowComponentCount += 1;
                scoringTerms.push(0);
            }
        });

        components.forEach((component) => {
            const compPred = component.pred.map((index) => pred[index]);
            const compRed = [];
            const compYellow = [];
            component.gold.forEach((goldIndex) => {
                if (allGoldIsRed[goldIndex]) compRed.push(allGold[goldIndex]);
                else compYellow.push(allGold[goldIndex]);
            });
            const compRedMerged = mergeSpans(compRed);
            const compYellowMerged = mergeSpans(compYellow);
            const compPredMerged = mergeSpans(compPred);
            const compGoldMerged = mergeSpans([...compRed, ...compYellow]);
            const compPredMinusYellow = subtractSpansMerged(compPredMerged, compYellowMerged);
            const baseScore = iouMerged(compRedMerged, compPredMinusYellow);
            const redCount = compRed.length;
            const yellowCount = compYellow.length;
            const predOnly = redCount === 0 && yellowCount === 0 && compPred.length > 0;

            compPred.forEach((predSpan) => {
                const predScore = predictionEntityScore(predSpan, compRed, compYellowMerged);
                predictionTermScores.push(predScore);
                if (predScore >= 1) truePositivePredictionCount += 1;
                else falsePositivePredictionCount += 1;
            });
            if (predOnly) {
                predOnlyPenaltyTermCount += 1;
                scoringTerms.push(0);
            } else if (hasRedInSample && (redCount > 0 || yellowCount > 0)) {
                const compFpOvercover = subtractSpansMerged(compPredMerged, compGoldMerged);
                mergeSpans(compFpOvercover).forEach((fpSpan) => {
                    if (fpSpan.end <= fpSpan.start) return;
                    const fpWeight = connectedFpSpanWeight(fpSpan, compGoldMerged);
                    if (fpWeight <= 0) return;
                    connectedFpPenaltyTermCount += 1;
                    connectedFpPenaltyDenominatorWeight += fpWeight;
                });
            }

            componentIous.push(baseScore);
            componentRedCounts.push(redCount);
            componentYellowCounts.push(yellowCount);
        });

        const predUnion = mergeSpans(pred);
        const redCoverage = coverageMetricsForFusedEntities(fusedRedEntities, predUnion, 'red');
        const yellowCoverage = coverageMetricsForFusedEntities(fusedYellowEntities, predUnion, 'yellow');
        const scoringNumerator = scoringTerms.reduce((sum, value) => sum + value, 0);
        const scoringDenominator = scoringTerms.length + yellowPenaltyDenominatorWeight + connectedFpPenaltyDenominatorWeight;
        const sampleScore = scoringDenominator <= 0 ? 1 : scoringNumerator / scoringDenominator;
        const out = {
            weighted_connected_mean_iou: sampleScore,
            entity_term_scores: entityTermScores,
            entity_term_count: entityTermScores.length,
            prediction_term_scores: predictionTermScores,
            prediction_term_count: predictionTermScores.length,
            true_positive_prediction_count: truePositivePredictionCount,
            false_positive_prediction_count: falsePositivePredictionCount,
            false_negative_entity_count: falseNegativeEntityCount,
            prediction_f1: f1FromCounts(truePositivePredictionCount, falsePositivePredictionCount, falseNegativeEntityCount),
            pred_only_penalty_term_count: predOnlyPenaltyTermCount,
            yellow_penalty_term_count: yellowPenaltyTermCount,
            yellow_penalty_denominator_weight: yellowPenaltyDenominatorWeight,
            connected_fp_penalty_term_count: connectedFpPenaltyTermCount,
            connected_fp_penalty_denominator_weight: connectedFpPenaltyDenominatorWeight,
            scoring_term_scores: scoringTerms,
            scoring_term_count: scoringTerms.length,
            effective_scoring_term_count: scoringDenominator,
            connected_component_count: components.length,
            connected_component_ious: componentIous,
            connected_component_gold_counts: componentRedCounts,
            connected_component_red_counts: componentRedCounts,
            connected_component_yellow_counts: componentYellowCounts,
            unforgivable_yellow_component_count: unforgivableYellowComponentCount,
            combinator_soft_span_count: combinatorSoft.length,
            fused_red_entity_count: fusionGroups.length,
            atomic_red_entity_count: hard.length,
            fused_yellow_entity_count: fusedYellowEntityCount,
            atomic_yellow_entity_count: soft.length,
            weighted_connected_iou_numerator: scoringNumerator,
            weighted_connected_iou_denominator: scoringDenominator,
            gold_entity_count: fusionGroups.length,
            red_entity_count: fusionGroups.length,
            yellow_entity_count: softCount
        };
        Object.assign(out, redCoverage, yellowCoverage);
        out.mean_entity_coverage = out.red_mean_entity_coverage;
        out.mean_entity_coverage_numerator = out.red_mean_entity_coverage_numerator;
        ['coverage_p50', 'coverage_p80', 'coverage_p90', 'coverage_p95'].forEach((key) => {
            out[key] = out['red_' + key];
            out[key + '_numerator'] = out['red_' + key + '_numerator'];
        });
        return out;
    }

    function scoreSampleEntityIou(goldSpans, predSpans, options = {}) {
        const hardGold = normalizeSpans(goldSpans);
        const softGold = normalizeSpans(options.softGoldSpans || []);
        const pred = normalizeSpans(predSpans, options.text ? options.text.length : undefined);
        const hardGoldMerged = mergeSpans(hardGold);
        const allGold = [...hardGold, ...softGold];
        const predStats = predSpanQualityStats(hardGoldMerged, pred);
        const fnStats = goldSpanFnStats(hardGoldMerged, pred);
        const connected = connectedEntityMetrics(hardGold, pred, {
            softGoldSpans: softGold,
            text: options.text || null,
            allowOptionalYellowTermsWhenNoRed: options.allowOptionalYellowTermsWhenNoRed ?? true
        });
        if (!allGold.length && !pred.length) {
            const out = {
                sample_entity_iou: 1,
                entity_term_scores: [],
                entity_term_count: 0,
                prediction_term_scores: [],
                prediction_term_count: 0,
                true_positive_prediction_count: 0,
                false_positive_prediction_count: 0,
                false_negative_entity_count: 0,
                prediction_f1: 1,
                pred_only_penalty_term_count: 0,
                yellow_penalty_term_count: 0,
                scoring_term_scores: [],
                component_term_scores: [],
                component_count: 0,
                gold_term_scores: [],
                unmatched_pred_count: 0,
                term_count: 0
            };
            Object.assign(out, predStats, fnStats, connected);
            out.hard_gold_span_total = hardGold.length;
            out.soft_gold_span_total = softGold.length;
            return out;
        }
        const componentScores = connected.connected_component_ious.map(Number);
        const scoringTerms = connected.scoring_term_scores.map(Number);
        const out = {
            sample_entity_iou: connected.weighted_connected_mean_iou,
            entity_term_scores: connected.entity_term_scores.map(Number),
            entity_term_count: connected.entity_term_count,
            prediction_term_scores: connected.prediction_term_scores,
            prediction_term_count: connected.prediction_term_count,
            true_positive_prediction_count: connected.true_positive_prediction_count,
            false_positive_prediction_count: connected.false_positive_prediction_count,
            false_negative_entity_count: connected.false_negative_entity_count,
            prediction_f1: connected.prediction_f1,
            pred_only_penalty_term_count: connected.pred_only_penalty_term_count,
            yellow_penalty_term_count: connected.yellow_penalty_term_count,
            scoring_term_scores: scoringTerms,
            component_term_scores: componentScores,
            component_count: componentScores.length,
            gold_term_scores: componentScores,
            unmatched_pred_count: countNonIntersectingSpans(pred, allGold),
            term_count: scoringTerms.length
        };
        Object.assign(out, predStats, fnStats, connected);
        out.hard_gold_span_total = hardGold.length;
        out.soft_gold_span_total = softGold.length;
        return out;
    }

    function boundaries(text, groups) {
        const points = [0, text.length];
        for (const group of groups) {
            for (const span of group) {
                points.push(Math.max(0, Math.min(text.length, span.start)));
                points.push(Math.max(0, Math.min(text.length, span.end)));
            }
        }
        return Array.from(new Set(points)).sort((left, right) => left - right);
    }

    function overlaps(span, start, end) {
        return Math.min(span.end, end) > Math.max(span.start, start);
    }

    function spansIntersect(left, right) {
        return Math.min(left.end, right.end) > Math.max(left.start, right.start);
    }

    function spansIntersectOrTouch(left, right) {
        return Math.min(left.end, right.end) >= Math.max(left.start, right.start);
    }

    function adjacentSpans(spans, anchor) {
        return normalizeSpans(spans).filter((span) => spansIntersect(span, anchor));
    }

    function selectionOffsets(root) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return null;
        const range = selection.getRangeAt(0);
        if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
        const startRange = range.cloneRange();
        startRange.selectNodeContents(root);
        startRange.setEnd(range.startContainer, range.startOffset);
        const endRange = range.cloneRange();
        endRange.selectNodeContents(root);
        endRange.setEnd(range.endContainer, range.endOffset);
        let start = startRange.toString().length;
        let end = endRange.toString().length;
        if (end < start) [start, end] = [end, start];
        if (end <= start) return null;
        return { start, end };
    }

    function spanLength(spans) {
        return normalizeSpans(spans).reduce((total, span) => total + Math.max(0, span.end - span.start), 0);
    }

    function intersectionLengthMerged(leftMerged, rightMerged) {
        let leftIndex = 0;
        let rightIndex = 0;
        let total = 0;
        while (leftIndex < leftMerged.length && rightIndex < rightMerged.length) {
            const start = Math.max(leftMerged[leftIndex].start, rightMerged[rightIndex].start);
            const end = Math.min(leftMerged[leftIndex].end, rightMerged[rightIndex].end);
            if (end > start) total += end - start;
            if (leftMerged[leftIndex].end <= rightMerged[rightIndex].end) leftIndex += 1;
            else rightIndex += 1;
        }
        return total;
    }

    function iouMerged(leftMerged, rightMerged) {
        const inter = intersectionLengthMerged(leftMerged, rightMerged);
        const union = spanLength(leftMerged) + spanLength(rightMerged) - inter;
        return union <= 0 ? 1 : inter / union;
    }

    function intersectSpans(left, right) {
        const leftMerged = mergeSpans(left);
        const rightMerged = mergeSpans(right);
        const out = [];
        let leftIndex = 0;
        let rightIndex = 0;
        while (leftIndex < leftMerged.length && rightIndex < rightMerged.length) {
            const start = Math.max(leftMerged[leftIndex].start, rightMerged[rightIndex].start);
            const end = Math.min(leftMerged[leftIndex].end, rightMerged[rightIndex].end);
            if (end > start) out.push({ start, end });
            if (leftMerged[leftIndex].end <= rightMerged[rightIndex].end) leftIndex += 1;
            else rightIndex += 1;
        }
        return out;
    }

    function subtractSpans(source, remove) {
        return subtractSpansMerged(mergeSpans(source), mergeSpans(remove));
    }

    function subtractSpansMerged(leftMerged, rightMerged) {
        if (!leftMerged.length) return [];
        if (!rightMerged.length) return leftMerged.map((span) => ({ ...span }));
        const out = [];
        let rightIndex = 0;
        for (const left of leftMerged) {
            let cursor = left.start;
            while (rightIndex < rightMerged.length && rightMerged[rightIndex].end <= cursor) rightIndex += 1;
            let checkIndex = rightIndex;
            while (checkIndex < rightMerged.length && rightMerged[checkIndex].start < left.end) {
                const right = rightMerged[checkIndex];
                if (right.start > cursor) out.push({ start: cursor, end: Math.min(left.end, right.start) });
                cursor = Math.max(cursor, right.end);
                if (cursor >= left.end) break;
                checkIndex += 1;
            }
            if (cursor < left.end) out.push({ start: cursor, end: left.end });
        }
        return out;
    }

    function countNonIntersectingSpans(left, right) {
        const leftSorted = sortedSpans(left);
        const rightMerged = mergeSpans(right);
        if (!leftSorted.length) return 0;
        if (!rightMerged.length) return leftSorted.length;
        let count = 0;
        let rightIndex = 0;
        leftSorted.forEach((span) => {
            while (rightIndex < rightMerged.length && rightMerged[rightIndex].end <= span.start) rightIndex += 1;
            if (rightIndex >= rightMerged.length || rightMerged[rightIndex].start >= span.end) count += 1;
        });
        return count;
    }

    function safeRate(numerator, denominator) {
        const denom = Number(denominator);
        return denom <= 0 ? 0 : Number(numerator) / denom;
    }

    function f1FromCounts(tp, fp, fn) {
        const denom = (2 * tp) + fp + fn;
        return denom <= 0 ? 1 : (2 * tp) / denom;
    }

    function formatPercent(value) {
        return (Math.round(value * 1000) / 10).toFixed(1) + '%';
    }

    function formatNumber(value) {
        const rounded = Math.round(Number(value) * 1000) / 1000;
        return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
    }

    if (typeof globalThis !== 'undefined' && globalThis.__REDACTIONBENCH_TEST__) {
        globalThis.__REDACTIONBENCH = {
            buildDemoSample,
            effectiveYellowCombinatorSpans,
            gallerySamples,
            scoreSampleEntityIou
        };
    }
})();
