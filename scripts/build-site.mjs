#!/usr/bin/env node
import { rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stageDirectory = path.join(repoRoot, '.field-stage');
const generatedDirectory = path.join(repoRoot, 'static', 'generated-fields');
const manifestPath = path.join(repoRoot, 'data', 'generated_fields.json');
const legacyManifestPath = path.join(repoRoot, 'data', 'generated-fields.json');
const routeArgument = process.argv.find((argument) => argument.startsWith('--field-routes='));
const requestedRoutes = routeArgument
    ? routeArgument.slice('--field-routes='.length).split(',').filter(Boolean)
    : [];
const hugoArguments = process.argv.slice(2).filter((argument) => argument !== routeArgument);

function run(command, args) {
    const result = spawnSync(command, args, { cwd: repoRoot, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status || 1);
}

await rm(stageDirectory, { force: true, recursive: true });
if (requestedRoutes.length === 0) {
    await rm(generatedDirectory, { force: true, recursive: true });
    await rm(manifestPath, { force: true });
    await rm(legacyManifestPath, { force: true });
}

run('hugo', [
    '--gc',
    '--minify',
    '--cleanDestinationDir',
    '--destination', stageDirectory,
    '--environment', 'field-export',
    '--baseURL', 'http://127.0.0.1/'
]);
run(process.execPath, [
    path.join(repoRoot, 'scripts', 'prerender-fields.mjs'),
    stageDirectory,
    ...requestedRoutes
]);
run('hugo', [
    '--gc',
    '--minify',
    '--cleanDestinationDir',
    '--destination', path.join(repoRoot, 'public'),
    ...hugoArguments
]);
