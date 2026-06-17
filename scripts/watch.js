#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const contentDir = path.join(projectRoot, 'content');

let isProcessing = false;
let queued = false;
let closing = false;
let hugoProcess = null;
let debounceTimer = null;
let lastReason = 'startup';
const pendingChanges = new Set();

function runCommand(command, args) {
    return new Promise((resolve) => {
        const child = spawn(command, args, {
            cwd: projectRoot,
            stdio: 'inherit'
        });
        child.on('error', (error) => {
            console.error(`[watch] Failed to run ${command}: ${error.message}`);
            resolve(1);
        });
        child.on('close', (code) => resolve(code));
    });
}

async function processContent(reason) {
    if (closing) return;

    if (isProcessing) {
        queued = true;
        lastReason = reason;
        return;
    }

    isProcessing = true;
    console.log(`\n[watch] Running process_blocks (${reason})`);
    const code = await runCommand('node', ['scripts/process-blocks.js']);

    if (code !== 0) {
        console.error(`[watch] process_blocks failed with code ${code}`);
    }

    isProcessing = false;

    if (!hugoProcess) {
        startHugoServer();
    }

    if (queued) {
        queued = false;
        await processContent(lastReason);
    }
}

function queueProcess(filename) {
    pendingChanges.add(filename);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const changedFiles = Array.from(pendingChanges);
        pendingChanges.clear();

        const summary = changedFiles.length === 1
            ? `change: ${changedFiles[0]}`
            : `changes: ${changedFiles.length} files`;

        if (isProcessing) {
            queued = true;
            lastReason = summary;
            return;
        }

        lastReason = summary;
        processContent(lastReason).catch((error) => {
            console.error('[watch] Fatal processing error:', error);
        });
    }, 150);
}

function startHugoServer() {
    console.log('\n[watch] Starting Hugo server');
    hugoProcess = spawn('hugo', ['server'], {
        cwd: projectRoot,
        stdio: 'inherit'
    });

    hugoProcess.on('error', (error) => {
        console.error(`[watch] Failed to start Hugo: ${error.message}`);
        process.exit(1);
    });

    hugoProcess.on('close', (code, signal) => {
        const reason = signal || code;
        console.log(`[watch] Hugo server exited (${reason})`);
        hugoProcess = null;

        if (!closing) {
            process.exit(code || 1);
        }
    });
}

async function main() {
    if (!fs.existsSync(contentDir)) {
        throw new Error(`Content directory not found: ${contentDir}`);
    }

    await processContent('startup');

    console.log(`[watch] Watching ${path.relative(projectRoot, contentDir)}/`);

    const watcher = fs.watch(contentDir, { recursive: true }, (_eventType, filename) => {
        if (!filename) return;
        queueProcess(filename);
    });

    const shutdown = (signal) => {
        if (closing) return;
        closing = true;
        console.log(`\n[watch] Received ${signal}, shutting down...`);
        watcher.close();
        clearTimeout(debounceTimer);

        if (hugoProcess) {
            hugoProcess.kill('SIGINT');
            setTimeout(() => process.exit(0), 500);
        } else {
            process.exit(0);
        }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
    console.error('[watch] Fatal error:', error);
    process.exit(1);
});
