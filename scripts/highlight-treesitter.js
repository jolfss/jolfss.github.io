#!/usr/bin/env node

/**
 * Tree-sitter-based syntax highlighting pre-processor for Hugo
 *
 * Reads *.md.code source files, applies Tree-sitter highlighting, outputs *.md files
 *
 * Mimics VS Code's architecture:
 * - Language-agnostic Tree-sitter parsing
 * - Universal token type mapping
 * - Theme-independent highlighting
 * - Fallback to Chroma for unsupported languages
 *
 * Usage: node scripts/highlight-treesitter.js
 *        npm run preprocess
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
 * Maps Tree-sitter node type to CSS class with semantic context
 * Uses parent node information to determine semantic meaning
 */
function getTokenClass(node) {
    const nodeType = node.type;
    const parent = node.parent;
    const grandparent = parent?.parent;

    // Direct mapping from token-map.js
    if (TOKEN_MAP[nodeType]) {
        return TOKEN_MAP[nodeType];
    }

    // Enhanced semantic analysis using parent context
    // Based on tree-sitter-python highlights.scm query patterns
    if (nodeType === 'identifier') {
        // Function definition: (function_definition name: (identifier))
        if (parent?.type === 'function_definition') {
            const nameNode = parent.childForFieldName('name');
            if (nameNode && node.startIndex === nameNode.startIndex && node.endIndex === nameNode.endIndex) {
                return 'ts-function-name';
            }
        }

        // Class definition: (class_definition name: (identifier))
        if (parent?.type === 'class_definition') {
            const nameNode = parent.childForFieldName('name');
            if (nameNode && node.startIndex === nameNode.startIndex && node.endIndex === nameNode.endIndex) {
                return 'ts-class';
            }
        }

        // Decorated function/class name
        if (parent?.type === 'decorated_definition') {
            const defNode = parent.childForFieldName('definition');
            if (defNode?.type === 'function_definition' || defNode?.type === 'class_definition') {
                return defNode.type === 'function_definition' ? 'ts-function-name' : 'ts-class';
            }
        }

        // Function call: (call function: (identifier))
        // Maps to tree-sitter query: (call function: (identifier) @function)
        if (parent?.type === 'call') {
            const funcNode = parent.childForFieldName('function');
            if (funcNode && node.startIndex === funcNode.startIndex && node.endIndex === funcNode.endIndex) {
                return 'ts-function-call';
            }
        }

        // Attribute access: (attribute attribute: (identifier))
        // Maps to tree-sitter query: (attribute attribute: (identifier) @property)
        if (parent?.type === 'attribute') {
            const attrNode = parent.childForFieldName('attribute');
            if (attrNode && node.startIndex === attrNode.startIndex && node.endIndex === attrNode.endIndex) {
                // If grandparent is a call, it's a method call
                // Maps to: (call function: (attribute attribute: (identifier) @function.method))
                const grandFuncNode = grandparent?.childForFieldName('function');
                if (grandparent?.type === 'call' && grandFuncNode &&
                    parent.startIndex === grandFuncNode.startIndex && parent.endIndex === grandFuncNode.endIndex) {
                    return 'ts-method-name';
                }
                return 'ts-property';
            }
        }

        // Type annotation: name: type or -> type
        if (parent?.type === 'type') {
            return 'ts-type';
        }

        // Parameter in function definition
        if (parent?.type === 'typed_parameter' || parent?.type === 'default_parameter' ||
            parent?.type === 'typed_default_parameter' || parent?.type === 'identifier' && grandparent?.type === 'parameters') {
            return 'ts-parameter';
        }

        // Check if it's a builtin type or function
        const builtins = ['int', 'str', 'float', 'bool', 'list', 'dict', 'tuple', 'set',
                         'print', 'len', 'range', 'enumerate', 'zip', 'map', 'filter',
                         'isinstance', 'type', 'object', 'super'];
        if (builtins.includes(node.text)) {
            return 'ts-builtin';
        }

        // Check if it's likely a constant (ALL_CAPS)
        if (node.text === node.text.toUpperCase() && node.text.length > 1) {
            return 'ts-constant';
        }

        // Check if it's a magic method or dunder
        if (node.text.startsWith('__') && node.text.endsWith('__')) {
            return 'ts-method-name';
        }
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
            class: getTokenClass(node)  // Pass full node instead of just type
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
 * Process a single markdown.code file and generate .md output
 */
function processMarkdownFile(sourceFilePath) {
    console.log(`Processing: ${sourceFilePath}`);

    const content = fs.readFileSync(sourceFilePath, 'utf8');
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

    // Write to .md file (remove .code extension)
    if (highlightedCount > 0) {
        const outputFilePath = sourceFilePath.replace(/\.md\.code$/, '.md');
        const newContent = matter.stringify(newMarkdown, frontmatter);
        fs.writeFileSync(outputFilePath, newContent, 'utf8');
        console.log(`  ✓ Generated ${path.basename(outputFilePath)} with ${highlightedCount} Tree-sitter highlight(s)`);
    }
}

/**
 * Main function
 */
async function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  Tree-sitter Syntax Highlighter (Preprocessor)');
    console.log('  Processes *.md.code → *.md');
    console.log('═══════════════════════════════════════════════════\n');

    // Find all .md.code files in content/
    const contentDir = path.join(__dirname, '..', 'content');
    const sourceFiles = await glob('**/*.md.code', { cwd: contentDir, absolute: true });

    console.log(`Found ${sourceFiles.length} .md.code source file(s)\n`);

    if (sourceFiles.length === 0) {
        console.log('ℹ  No .md.code files found to process');
        console.log('   Create .md.code files with code blocks to enable preprocessing');
        console.log('');
    }

    for (const file of sourceFiles) {
        try {
            processMarkdownFile(file);
            console.log('');
        } catch (error) {
            console.error(`✗ Error processing ${file}:`, error);
            console.log('');
        }
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('✓ Preprocessing complete!');
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
