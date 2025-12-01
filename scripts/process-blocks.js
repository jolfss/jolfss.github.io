#!/usr/bin/env node

/**
 * Block-based content processor for Hugo
 *
 * Reads *.md source files, splits on HTML block comment delimiters, wraps in grid-aligned panels
 *
 * Features:
 * - Splits content into blocks using `<!-- block:start --> ... <!-- block:end -->`
 *   (falls back to legacy `---` delimiters if no block comments are present)
 * - Detects panel type via block comment attributes or legacy `<!-- panel: ... -->`
 * - Applies Tree-sitter syntax highlighting to code blocks
 * - Wraps each block in `<div class="rem-height-ceil-js p-{type}">...</div>`
 * - Outputs to build/content/ (processed .md files) for Hugo to consume
 *
 * Usage: node scripts/process-blocks.js
 *        npm run process_blocks
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const matter = require('gray-matter');

// Import highlighting logic from highlight-treesitter.js
const { highlightCode, extractCodeBlocks, loadLanguage } = require('./highlight-treesitter.js');

/**
 * Splits markdown content into blocks based on `---` delimiters
 * Returns array of {content, panelType}
 */
function splitIntoBlocks(markdownContent) {
    const blockStartRegex = /^<!--\s*block:start(?:\s+type=([a-z0-9-]+))?\s*-->$/im;
    const blockEndRegex = /^<!--\s*block:end\s*-->$/im;
    const usesBlockComments = blockStartRegex.test(markdownContent);

    if (usesBlockComments) {
        const blocks = [];
        const lines = markdownContent.split('\n');
        let currentBlock = [];
        let currentPanelType = 'p-default';
        let insideBlock = false;
        let outsideBlock = [];

        const flushBlock = () => {
            if (currentBlock.length > 0 && currentBlock.join('\n').trim().length > 0) {
                blocks.push({
                    content: currentBlock.join('\n'),
                    panelType: currentPanelType
                });
            }
            currentBlock = [];
            currentPanelType = 'p-default';
        };

        const flushOutside = () => {
            if (outsideBlock.length > 0 && outsideBlock.join('\n').trim().length > 0) {
                blocks.push({
                    content: outsideBlock.join('\n'),
                    panelType: 'p-default'
                });
            }
            outsideBlock = [];
        };

        for (const line of lines) {
            const startMatch = line.match(blockStartRegex);
            const isEnd = blockEndRegex.test(line);

            if (startMatch) {
                if (insideBlock) {
                    flushBlock();
                } else {
                    flushOutside();
                }
                currentPanelType = startMatch[1] || 'p-default';
                insideBlock = true;
                currentBlock = [];
                continue;
            }

            if (isEnd) {
                if (insideBlock) {
                    flushBlock();
                    insideBlock = false;
                }
                continue;
            }

            if (insideBlock) {
                currentBlock.push(line);
            } else {
                outsideBlock.push(line);
            }
        }

        if (insideBlock) {
            flushBlock();
        }
        flushOutside();

        return blocks;
    }

    // Fallback: legacy `---` delimiters
    const blocks = [];
    const lines = markdownContent.split('\n');
    let currentBlock = [];
    let currentPanelType = 'p-default';

    for (const line of lines) {
        if (line.trim() === '---') {
            if (currentBlock.length > 0) {
                blocks.push({
                    content: currentBlock.join('\n'),
                    panelType: currentPanelType
                });
                currentBlock = [];
                currentPanelType = 'p-default';
            }
        } else {
            const panelMatch = line.match(/^<!--\s*panel:\s*([a-z-]+)\s*-->$/i);
            if (panelMatch && currentBlock.length === 0) {
                currentPanelType = panelMatch[1];
            } else {
                currentBlock.push(line);
            }
        }
    }

    if (currentBlock.length > 0) {
        blocks.push({
            content: currentBlock.join('\n'),
            panelType: currentPanelType
        });
    }

    return blocks;
}

/**
 * Process code blocks within a block's content using Tree-sitter
 */
function processCodeBlocks(content) {
    const codeBlocks = extractCodeBlocks(content);

    if (codeBlocks.length === 0) {
        return content;
    }

    // Replace code blocks from end to start (to preserve indices)
    let newContent = content;

    for (let i = codeBlocks.length - 1; i >= 0; i--) {
        const block = codeBlocks[i];

        // Try to highlight with Tree-sitter
        const highlighted = highlightCode(block.code, block.lang);

        if (highlighted) {
            // Successfully highlighted with Tree-sitter
            newContent =
                newContent.slice(0, block.start) +
                highlighted +
                newContent.slice(block.end);
        }
        // If highlighting fails, leave the original code block for Hugo/Chroma
    }

    return newContent;
}

/**
 * Wraps a block in a panel div
 */
function wrapInPanel(content, panelType) {
    // Process any code blocks in this content first
    const processedContent = processCodeBlocks(content);

    return `<div class="rem-height-ceil-js ${panelType}">

${processedContent}

</div>`;
}

/**
 * Copy asset files (images, etc.) from source directory to build directory
 */
function copyAssets(sourceDir, outputDir) {
    const sourceFileDir = path.dirname(sourceDir);
    const outputFileDir = path.dirname(outputDir);

    // Get all files in the source directory
    const files = fs.readdirSync(sourceFileDir);

    // Copy non-markdown files
    for (const file of files) {
        if (!file.endsWith('.md')) {
            const sourcePath = path.join(sourceFileDir, file);
            const destPath = path.join(outputFileDir, file);

            // Only copy if it's a file (not a directory)
            const stat = fs.statSync(sourcePath);
            if (stat.isFile()) {
                fs.copyFileSync(sourcePath, destPath);
            }
        }
    }
}

/**
 * Process a single markdown file and generate output
 */
function processMarkdownFile(sourceFilePath, outputDir) {
    console.log(`Processing: ${sourceFilePath}`);

    const content = fs.readFileSync(sourceFilePath, 'utf8');
    const { data: frontmatter, content: markdown } = matter(content);

    // Split content into blocks
    const blocks = splitIntoBlocks(markdown);

    // Filter out empty/whitespace-only blocks and wrap remaining blocks in panels
    const nonEmptyBlocks = blocks.filter(block => block.content.trim().length > 0);

    console.log(`  Found ${blocks.length} block(s), ${nonEmptyBlocks.length} non-empty`);

    const wrappedBlocks = nonEmptyBlocks.map((block, i) => {
        console.log(`    Block ${i + 1}: ${block.panelType}`);
        return wrapInPanel(block.content, block.panelType);
    });

    // Join blocks with newlines
    const newMarkdown = wrappedBlocks.join('\n\n');

    // Reconstruct the full markdown with frontmatter
    const newContent = matter.stringify(newMarkdown, frontmatter);

    // Determine output path
    const relativePath = path.relative(
        path.join(__dirname, '..', 'content'),
        sourceFilePath
    );
    const outputFilePath = path.join(outputDir, relativePath);

    // Ensure output directory exists
    const outputFileDir = path.dirname(outputFilePath);
    fs.mkdirSync(outputFileDir, { recursive: true });

    // Write output file
    fs.writeFileSync(outputFilePath, newContent, 'utf8');
    console.log(`  ✓ Generated ${path.relative(outputDir, outputFilePath)}`);

    // Copy asset files (images, etc.) from the same directory
    copyAssets(sourceFilePath, outputFilePath);
}

/**
 * Main function
 */
async function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  Block-Based Content Processor');
    console.log('  Processes content/*.md → build/content/*.md');
    console.log('═══════════════════════════════════════════════════\n');

    // Set up paths
    const contentDir = path.join(__dirname, '..', 'content');
    const outputDir = path.join(__dirname, '..', 'build', 'content');

    // Create output directory if it doesn't exist
    fs.mkdirSync(outputDir, { recursive: true });

    // Find all .md files in content/
    const sourceFiles = await glob('**/*.md', { cwd: contentDir, absolute: true });

    console.log(`Found ${sourceFiles.length} .md source file(s)\n`);

    if (sourceFiles.length === 0) {
        console.log('ℹ  No .md files found to process');
        console.log('');
        return;
    }

    for (const file of sourceFiles) {
        try {
            processMarkdownFile(file, outputDir);
            console.log('');
        } catch (error) {
            console.error(`✗ Error processing ${file}:`, error);
            console.log('');
        }
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('✓ Processing complete!');
    console.log('═══════════════════════════════════════════════════');
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { splitIntoBlocks, wrapInPanel, processMarkdownFile };
