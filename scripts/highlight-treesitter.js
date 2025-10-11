#!/usr/bin/env node

/**
 * Tree-sitter-based syntax highlighting pre-processor for Hugo
 *
 * Mimics VS Code's architecture:
 * - Language-agnostic Tree-sitter parsing
 * - Universal token type mapping
 * - Theme-independent highlighting
 * - Fallback to Chroma for unsupported languages
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const matter = require('gray-matter');
const Parser = require('tree-sitter');

// Language registry - add Tree-sitter parsers here
const LANGUAGES = {
    python: { parser: null, module: 'tree-sitter-python' },
    javascript: { parser: null, module: 'tree-sitter-javascript' },
    js: { parser: null, module: 'tree-sitter-javascript' },
    typescript: { parser: null, module: 'tree-sitter-typescript', subparser: 'typescript' },
    ts: { parser: null, module: 'tree-sitter-typescript', subparser: 'typescript' },
    tsx: { parser: null, module: 'tree-sitter-typescript', subparser: 'tsx' },
    rust: { parser: null, module: 'tree-sitter-rust' },
    go: { parser: null, module: 'tree-sitter-go' },
    c: { parser: null, module: 'tree-sitter-c' },
    cpp: { parser: null, module: 'tree-sitter-cpp' },
    java: { parser: null, module: 'tree-sitter-java' },
    bash: { parser: null, module: 'tree-sitter-bash' },
    sh: { parser: null, module: 'tree-sitter-bash' },
    html: { parser: null, module: 'tree-sitter-html' },
    css: { parser: null, module: 'tree-sitter-css' },
    json: { parser: null, module: 'tree-sitter-json' },
};

// Load token mapping
const TOKEN_MAP = require('./token-map.js');

/**
 * Lazily loads a Tree-sitter language parser
 */
function loadLanguage(lang) {
    const langConfig = LANGUAGES[lang];
    if (!langConfig) {
        return null;
    }

    if (langConfig.parser) {
        return langConfig.parser;
    }

    try {
        const module = require(langConfig.module);
        langConfig.parser = langConfig.subparser ? module[langConfig.subparser] : module;
        console.log(`  ✓ Loaded ${langConfig.module}`);
        return langConfig.parser;
    } catch (error) {
        console.warn(`  ⚠ Could not load ${langConfig.module}:`, error.message);
        console.warn(`    Install with: npm install ${langConfig.module}`);
        return null;
    }
}

/**
 * Extracts code blocks from markdown content
 * Returns array of {lang, code, start, end, original}
 */
function extractCodeBlocks(content) {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks = [];
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
        blocks.push({
            lang: match[1] || 'text',
            code: match[2],
            start: match.index,
            end: match.index + match[0].length,
            original: match[0]
        });
    }

    return blocks;
}

/**
 * Maps Tree-sitter node type to CSS class (VS Code-style semantic tokens)
 */
function getTokenClass(nodeType) {
    // Direct mapping from token-map.js
    if (TOKEN_MAP[nodeType]) {
        return TOKEN_MAP[nodeType];
    }

    // Fallback: normalize node type to CSS class
    return `ts-${nodeType.replace(/_/g, '-')}`;
}

/**
 * Recursively walks AST and collects tokens with positions
 * This is similar to VS Code's semantic token provider
 */
function collectTokens(node, sourceCode) {
    const tokens = [];

    // If this node has no children, it's a leaf token
    if (node.childCount === 0) {
        const text = sourceCode.slice(node.startIndex, node.endIndex);

        // Skip empty tokens
        if (text.trim().length === 0) {
            return tokens;
        }

        tokens.push({
            type: node.type,
            text: text,
            start: node.startIndex,
            end: node.endIndex,
            class: getTokenClass(node.type)
        });
    } else {
        // Recurse into children
        for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i);
            tokens.push(...collectTokens(child, sourceCode));
        }
    }

    return tokens;
}

/**
 * Escapes HTML special characters
 */
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Generates highlighted HTML from tokens
 */
function generateHighlightedHtml(code, tokens) {
    // Sort tokens by start position
    tokens.sort((a, b) => a.start - b.start);

    let html = '';
    let lastIndex = 0;

    for (const token of tokens) {
        // Add any unhighlighted text before this token
        if (token.start > lastIndex) {
            const gap = code.slice(lastIndex, token.start);
            html += escapeHtml(gap);
        }

        // Add the highlighted token
        html += `<span class="${token.class}">${escapeHtml(token.text)}</span>`;
        lastIndex = token.end;
    }

    // Add any remaining text
    if (lastIndex < code.length) {
        html += escapeHtml(code.slice(lastIndex));
    }

    return html;
}

/**
 * Highlights code with Tree-sitter for any supported language
 */
function highlightCode(code, lang) {
    const language = loadLanguage(lang);

    if (!language) {
        return null; // Signal to use fallback
    }

    try {
        const parser = new Parser();
        parser.setLanguage(language);

        const tree = parser.parse(code);
        const tokens = collectTokens(tree.rootNode, code);
        const html = generateHighlightedHtml(code, tokens);

        return `<pre class="ts-highlight ts-${lang}"><code>${html}</code></pre>`;
    } catch (error) {
        console.error(`  ✗ Error highlighting ${lang}:`, error.message);
        return null; // Signal to use fallback
    }
}

/**
 * Process a single markdown file
 */
function processMarkdownFile(filePath) {
    console.log(`Processing: ${filePath}`);

    const content = fs.readFileSync(filePath, 'utf8');
    const { data: frontmatter, content: markdown } = matter(content);

    // Extract code blocks
    const blocks = extractCodeBlocks(markdown);

    if (blocks.length === 0) {
        console.log(`  No code blocks found`);
        return;
    }

    console.log(`  Found ${blocks.length} code block(s)`);

    // Replace code blocks from end to start (to preserve indices)
    let newMarkdown = markdown;
    let highlightedCount = 0;

    for (let i = blocks.length - 1; i >= 0; i--) {
        const block = blocks[i];

        // Try to highlight with Tree-sitter
        const highlighted = highlightCode(block.code, block.lang);

        if (highlighted) {
            // Successfully highlighted with Tree-sitter
            newMarkdown =
                newMarkdown.slice(0, block.start) +
                highlighted +
                newMarkdown.slice(block.end);
            highlightedCount++;
            console.log(`    ✓ Tree-sitter: ${block.lang} (block ${i + 1})`);
        } else {
            // Leave as-is for Hugo/Chroma to handle
            console.log(`    → Chroma fallback: ${block.lang} (block ${i + 1})`);
        }
    }

    // Only write if changes were made
    if (highlightedCount > 0) {
        const newContent = matter.stringify(newMarkdown, frontmatter);
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`  ✓ Updated with ${highlightedCount} Tree-sitter highlight(s)`);
    }
}

/**
 * Main function
 */
async function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  Tree-sitter Syntax Highlighter');
    console.log('  VS Code-style semantic token highlighting');
    console.log('═══════════════════════════════════════════════════\n');

    // Find all markdown files in content/
    const contentDir = path.join(__dirname, '..', 'content');
    const markdownFiles = await glob('**/*.md', { cwd: contentDir, absolute: true });

    console.log(`Found ${markdownFiles.length} markdown file(s)\n`);

    let totalHighlighted = 0;
    for (const file of markdownFiles) {
        try {
            processMarkdownFile(file);
            console.log('');
        } catch (error) {
            console.error(`✗ Error processing ${file}:`, error);
            console.log('');
        }
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('✓ Highlighting complete!');
    console.log('═══════════════════════════════════════════════════');
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { highlightCode, extractCodeBlocks, loadLanguage };
