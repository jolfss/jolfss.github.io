#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stageRoot = path.resolve(repoRoot, process.argv[2] || '.field-stage');
const outputRoot = path.join(repoRoot, 'static', 'generated-fields');
const manifestPath = path.join(repoRoot, 'data', 'generated_fields.json');
const requestedRoutes = new Set(process.argv.slice(3));

const mimeTypes = new Map([
    ['.css', 'text/css; charset=utf-8'],
    ['.gif', 'image/gif'],
    ['.html', 'text/html; charset=utf-8'],
    ['.jpeg', 'image/jpeg'],
    ['.jpg', 'image/jpeg'],
    ['.js', 'text/javascript; charset=utf-8'],
    ['.json', 'application/json; charset=utf-8'],
    ['.png', 'image/png'],
    ['.svg', 'image/svg+xml'],
    ['.webp', 'image/webp'],
    ['.woff2', 'font/woff2']
]);

function fieldProfiles() {
    return [
        { minWidth: 0, maxWidth: 600, renderWidth: 599 },
        { minWidth: 600, maxWidth: 865, renderWidth: 864 },
        { minWidth: 865, maxWidth: null, renderWidth: 3072 }
    ];
}

async function htmlFiles(directory) {
    const files = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) files.push(...await htmlFiles(absolute));
        else if (entry.isFile() && entry.name.endsWith('.html')) files.push(absolute);
    }
    return files;
}

function routeForFile(filename) {
    const relative = path.relative(stageRoot, filename).split(path.sep).join('/');
    if (relative === 'index.html') return '/';
    if (relative.endsWith('/index.html')) return `/${relative.slice(0, -'index.html'.length)}`;
    return `/${relative}`;
}

function routeKey(route) {
    return createHash('sha256').update(route).digest('hex').slice(0, 16);
}

async function startStaticServer() {
    const server = createServer(async (request, response) => {
        try {
            const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
            let filename = path.resolve(stageRoot, `.${requestPath}`);
            if (!filename.startsWith(`${stageRoot}${path.sep}`) && filename !== stageRoot) {
                response.writeHead(403).end('Forbidden');
                return;
            }
            let info = await stat(filename).catch(() => null);
            if (info?.isDirectory()) {
                filename = path.join(filename, 'index.html');
                info = await stat(filename).catch(() => null);
            }
            if (!info?.isFile()) {
                response.writeHead(404).end('Not found');
                return;
            }
            response.writeHead(200, {
                'Cache-Control': 'no-store',
                'Content-Type': mimeTypes.get(path.extname(filename)) || 'application/octet-stream'
            });
            createReadStream(filename).pipe(response);
        } catch (error) {
            response.writeHead(500).end(String(error));
        }
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    return { origin: `http://127.0.0.1:${address.port}`, server };
}

await stat(stageRoot).catch(() => {
    throw new Error(`Staging build not found at ${stageRoot}`);
});
await mkdir(outputRoot, { recursive: true });
await mkdir(path.dirname(manifestPath), { recursive: true });

const files = (await htmlFiles(stageRoot)).sort().filter((filename) => (
    requestedRoutes.size === 0 || requestedRoutes.has(routeForFile(filename))
));
const profiles = fieldProfiles();
const manifest = requestedRoutes.size > 0
    ? JSON.parse(await readFile(manifestPath, 'utf8').catch(() => '{}'))
    : {};
const { origin, server } = await startStaticServer();
const browser = await chromium.launch({ headless: true });

try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(120000);
    for (const [fileIndex, filename] of files.entries()) {
        const route = routeForFile(filename);
        const key = routeKey(route);
        const variants = [];
        console.log(`[${fileIndex + 1}/${files.length}] ${route}`);

        for (const profile of profiles) {
            await page.setViewportSize({ width: profile.renderWidth, height: 900 });
            await page.goto(`${origin}${route}?field-export=1`, { waitUntil: 'load' });
            const result = await page.evaluate(async () => {
                if (typeof window.__renderComplexGridSvg !== 'function') {
                    throw new Error('Complex-grid SVG exporter did not initialize.');
                }
                return window.__renderComplexGridSvg();
            });
            const contentKey = createHash('sha256').update(result.svg).digest('hex').slice(0, 12);
            const basename = `${key}-${profile.renderWidth}-${contentKey}.svg`;
            await writeFile(path.join(outputRoot, basename), result.svg);
            variants.push({
                asset: `generated-fields/${basename}`,
                height: result.height,
                maxWidth: profile.maxWidth,
                minWidth: profile.minWidth,
                renderWidth: profile.renderWidth,
                width: result.width
            });
        }
        manifest[route] = { variants };
    }
} finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${Object.keys(manifest).length} page field manifests to ${path.relative(repoRoot, manifestPath)}.`);
