#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');
const { glob } = require('glob');
const cheerio = require('cheerio');
const { chromium } = require('playwright');

const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const TARGET_SELECTOR = '.rem-height-ceil-js';
const STATIC_ID_ATTR = 'data-rem-static-id';
const STATIC_FLAG_ATTR = 'data-rem-static';

const VIEWPORTS = [
    { key: 'desktop', width: 1280, height: 900 },
    { key: 'mobile', width: 390, height: 844 },
];

function routeFromHtmlFile(htmlPath) {
    const rel = path.relative(PUBLIC_DIR, htmlPath).replace(/\\/g, '/');

    if (rel === 'index.html') {
        return '/';
    }

    if (rel.endsWith('/index.html')) {
        return `/${rel.slice(0, -'index.html'.length)}`;
    }

    return `/${rel}`;
}

function assignStaticIds(html) {
    const $ = cheerio.load(html, { decodeEntities: false });
    const used = new Set();
    let counter = 1;
    let changed = false;

    $(`${TARGET_SELECTOR}[${STATIC_ID_ATTR}]`).each((_, el) => {
        const id = $(el).attr(STATIC_ID_ATTR);
        if (id) {
            used.add(id);
        }
    });

    $(TARGET_SELECTOR).each((_, el) => {
        const node = $(el);
        if (node.attr('data-rem-static-skip') === 'true') {
            return;
        }

        let id = node.attr(STATIC_ID_ATTR);
        if (id) {
            return;
        }

        while (used.has(`rh-${counter}`)) {
            counter += 1;
        }

        id = `rh-${counter}`;
        counter += 1;
        used.add(id);
        node.attr(STATIC_ID_ATTR, id);
        changed = true;
    });

    return {
        html: $.html(),
        changed
    };
}

function parseInlineStyle(styleText) {
    const styleMap = {};
    if (!styleText) {
        return styleMap;
    }

    styleText.split(';').forEach((entry) => {
        const trimmed = entry.trim();
        if (!trimmed) return;
        const separator = trimmed.indexOf(':');
        if (separator === -1) return;
        const key = trimmed.slice(0, separator).trim();
        const value = trimmed.slice(separator + 1).trim();
        if (key) {
            styleMap[key] = value;
        }
    });

    return styleMap;
}

function formatInlineStyle(styleMap) {
    return Object.entries(styleMap)
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ');
}

function contentTypeForFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.html': return 'text/html; charset=utf-8';
        case '.css': return 'text/css; charset=utf-8';
        case '.js': return 'application/javascript; charset=utf-8';
        case '.json': return 'application/json; charset=utf-8';
        case '.svg': return 'image/svg+xml';
        case '.png': return 'image/png';
        case '.jpg':
        case '.jpeg': return 'image/jpeg';
        case '.gif': return 'image/gif';
        case '.webp': return 'image/webp';
        case '.woff': return 'font/woff';
        case '.woff2': return 'font/woff2';
        default: return 'application/octet-stream';
    }
}

function resolveRequestPath(urlPath) {
    const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
    let candidate = path.join(PUBLIC_DIR, safePath);

    if (safePath.endsWith('/')) {
        candidate = path.join(PUBLIC_DIR, safePath, 'index.html');
    } else if (!path.extname(candidate)) {
        const indexCandidate = path.join(PUBLIC_DIR, safePath, 'index.html');
        const htmlCandidate = `${candidate}.html`;
        if (fs.existsSync(indexCandidate)) {
            candidate = indexCandidate;
        } else if (fs.existsSync(htmlCandidate)) {
            candidate = htmlCandidate;
        }
    }

    if (!candidate.startsWith(PUBLIC_DIR)) {
        return null;
    }

    return candidate;
}

function startStaticServer() {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            try {
                const parsed = new URL(req.url, 'http://127.0.0.1');
                const filePath = resolveRequestPath(parsed.pathname);

                if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
                    res.statusCode = 404;
                    res.end('Not found');
                    return;
                }

                const body = fs.readFileSync(filePath);
                res.setHeader('Content-Type', contentTypeForFile(filePath));
                res.statusCode = 200;
                res.end(body);
            } catch (error) {
                res.statusCode = 500;
                res.end(`Server error: ${error.message}`);
            }
        });

        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            resolve({
                server,
                origin: `http://127.0.0.1:${address.port}`
            });
        });
    });
}

async function readAndPrepareHtmlFiles() {
    const htmlFiles = await glob('**/*.html', { cwd: PUBLIC_DIR, absolute: true });
    let preparedCount = 0;

    for (const htmlPath of htmlFiles) {
        const original = fs.readFileSync(htmlPath, 'utf8');
        const prepared = assignStaticIds(original);
        if (prepared.changed) {
            fs.writeFileSync(htmlPath, prepared.html, 'utf8');
            preparedCount += 1;
        }
    }

    return { htmlFiles, preparedCount };
}

async function measurePageForViewport(context, urlPath) {
    const page = await context.newPage();

    try {
        await page.goto(urlPath, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        try {
            await page.waitForLoadState('networkidle', { timeout: 10000 });
        } catch {
            // Ignore timeout: external resources (e.g., MathJax/font CDNs) can keep the network active.
        }

        await page.evaluate(async () => {
            if (document.fonts && document.fonts.ready) {
                try {
                    await document.fonts.ready;
                } catch {
                    // Ignore font loading failures and continue with fallback fonts.
                }
            }

            if (
                typeof window.MathJax !== 'undefined' &&
                window.MathJax.startup &&
                window.MathJax.startup.promise
            ) {
                try {
                    await window.MathJax.startup.promise;
                } catch {
                    // Ignore MathJax errors and continue.
                }
            }
        });

        await page.waitForTimeout(60);

        return await page.evaluate(({ selector, staticIdAttr }) => {
            const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
            const stepPx = 2 * remPx;
            const values = {};

            document.querySelectorAll(`${selector}[${staticIdAttr}]`).forEach((el) => {
                const id = el.getAttribute(staticIdAttr);
                if (!id) return;

                const measured = Math.max(
                    el.getBoundingClientRect().height,
                    el.scrollHeight
                );
                const snappedPx = Math.max(stepPx, Math.ceil(measured / stepPx) * stepPx);
                const snappedRem = snappedPx / remPx;
                const remValue = `${Number(snappedRem.toFixed(4)).toString()}rem`;
                values[id] = remValue;
            });

            return values;
        }, {
            selector: TARGET_SELECTOR,
            staticIdAttr: STATIC_ID_ATTR
        });
    } finally {
        await page.close();
    }
}

async function collectMeasurements(origin, htmlFiles) {
    const measurements = {};
    const browser = await chromium.launch({ headless: true });

    try {
        for (const viewport of VIEWPORTS) {
            console.log(`Measuring viewport: ${viewport.key} (${viewport.width}x${viewport.height})`);

            const context = await browser.newContext({
                viewport: {
                    width: viewport.width,
                    height: viewport.height
                }
            });

            await context.route('**/*rem-height-ceil*.js', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/javascript; charset=utf-8',
                    body: ''
                });
            });

            for (const htmlPath of htmlFiles) {
                const route = routeFromHtmlFile(htmlPath);
                const url = `${origin}${route}`;
                const pageMeasurements = await measurePageForViewport(context, url);

                if (!measurements[htmlPath]) {
                    measurements[htmlPath] = {};
                }

                Object.entries(pageMeasurements).forEach(([id, value]) => {
                    if (!measurements[htmlPath][id]) {
                        measurements[htmlPath][id] = {};
                    }
                    measurements[htmlPath][id][viewport.key] = value;
                });
            }

            await context.close();
        }
    } finally {
        await browser.close();
    }

    return measurements;
}

function applyMeasurementsToHtml(html, pageMeasurements) {
    const $ = cheerio.load(html, { decodeEntities: false });
    let changed = false;

    $(TARGET_SELECTOR).each((_, el) => {
        const node = $(el);
        const id = node.attr(STATIC_ID_ATTR);
        if (!id) {
            return;
        }

        const values = pageMeasurements[id];
        if (!values || (!values.desktop && !values.mobile)) {
            return;
        }

        const styleMap = parseInlineStyle(node.attr('style'));

        if (values.desktop) {
            styleMap['--rh-desktop'] = values.desktop;
        }
        if (values.mobile) {
            styleMap['--rh-mobile'] = values.mobile;
        }

        node.attr('style', formatInlineStyle(styleMap));
        node.attr(STATIC_FLAG_ATTR, 'true');
        changed = true;
    });

    return {
        html: $.html(),
        changed
    };
}

async function main() {
    if (!fs.existsSync(PUBLIC_DIR)) {
        throw new Error(`Public directory not found: ${PUBLIC_DIR}. Run Hugo first.`);
    }

    const { htmlFiles, preparedCount } = await readAndPrepareHtmlFiles();
    console.log(`Prepared ${preparedCount} HTML file(s) with static IDs.`);

    if (htmlFiles.length === 0) {
        console.log('No HTML files found under public/.');
        return;
    }

    const { server, origin } = await startStaticServer();
    console.log(`Started temporary static server at ${origin}`);

    try {
        const measurements = await collectMeasurements(origin, htmlFiles);

        let patchedCount = 0;

        for (const htmlPath of htmlFiles) {
            const original = fs.readFileSync(htmlPath, 'utf8');
            const pageMeasurements = measurements[htmlPath] || {};
            const patched = applyMeasurementsToHtml(original, pageMeasurements);

            if (patched.changed) {
                fs.writeFileSync(htmlPath, patched.html, 'utf8');
                patchedCount += 1;
            }
        }

        console.log(`Applied static panel heights to ${patchedCount} HTML file(s).`);
    } finally {
        server.close();
    }
}

main().catch((error) => {
    console.error('precompute-panel-heights failed:', error);
    process.exit(1);
});
