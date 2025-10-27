# Hugo Build Scripts

This directory contains scripts for generating and processing content for the Hugo static site.

## Scripts

### `color-code.py`

Automatically converts VS Code color theme JSON to SCSS variables for syntax highlighting.

**Source**: `~/Sean/jolly/themes/jolly-light-color-theme.json`
**Output**: `assets/scss/base/_jolly-theme-generated.scss`

**Usage**:
```bash
python3 scripts/color-code.py
# or
npm run color_code
```

**How it works**:
1. Reads the Jolly Light VS Code theme JSON
2. Extracts `semanticTokenColors` and `tokenColors`
3. Maps VS Code token types to Tree-sitter CSS classes
4. Generates SCSS variables and CSS custom properties
5. Writes to `_jolly-theme-generated.scss`

**When to regenerate**:
- After modifying the Jolly Light theme colors
- Before building the site (runs automatically via `npm run build`)
- To sync website colors with your editor theme

### `highlight-treesitter.js`

Pre-processes markdown source files to add Tree-sitter-based syntax highlighting to code blocks.

**Input**: `content/**/*.md.code` (source files with code blocks)
**Output**: `content/**/*.md` (generated files with highlighted code)

**Usage**:
```bash
node scripts/highlight-treesitter.js
# or
npm run preprocess
```

**How it works**:
1. Scans for `*.md.code` source files in `content/`
2. Finds code blocks with language annotations
3. Parses code with Tree-sitter language parsers
4. Generates HTML with semantic token classes (e.g., `ts-keyword`, `ts-function-name`)
5. Replaces code blocks with pre-highlighted HTML
6. Writes output to `.md` file (generated, gitignored)
7. Falls back to Hugo/Chroma for unsupported languages

**Important**:
- `.md.code` files are your source of truth (committed to git)
- `.md` files are generated build artifacts (gitignored)
- Edit `.md.code` files only; `.md` files will be regenerated on build

**Supported languages**:
- Python, JavaScript, TypeScript, Rust, Go, C, C++, Java
- Bash, HTML, CSS, JSON
- See `LANGUAGES` map in script for full list

### `token-map.js`

Maps Tree-sitter node types to VS Code-style semantic token CSS classes.

**Purpose**: Universal mapping that works across all Tree-sitter languages, enabling theme-independent highlighting similar to VS Code's architecture.

## Build Pipeline

The complete build pipeline is:

```bash
npm run build
```

Which runs:
1. `npm run color_code` - Generate SCSS from VS Code theme
2. `npm run preprocess` - Process `.md.code` → `.md` with Tree-sitter highlighting
3. `hugo --gc --minify` - Build static site

## File Structure

### Source Files (Committed)
```
content/
├── _index.md              # Structural files without code blocks
├── blog/
│   ├── _index.md
│   └── post.md.code       # Source files WITH code blocks
└── projects/
    └── project/
        └── index.md.code  # Source files WITH code blocks
```

### Generated Files (Gitignored)
```
content/
├── blog/
│   └── post.md            # Generated from post.md.code
└── projects/
    └── project/
        └── index.md       # Generated from index.md.code
```

## Workflow

### Creating New Content With Code

1. **Create source file**: `content/blog/my-post.md.code`
```markdown
---
title: "My Post"
---

Here's some Python code:

\`\`\`python
def hello():
    print("Hello, world!")
\`\`\`
```

2. **Build**: Run `npm run build` or `npm run preprocess`
3. **Result**: `content/blog/my-post.md` is generated with highlighted code
4. **Commit**: Only commit `my-post.md.code` (source), not `my-post.md` (generated)

### Creating Content Without Code

For pages without code blocks (like index pages), just create regular `.md` files:
- They won't be processed by the preprocessor
- They're committed to git normally
- Hugo uses them directly

### Updating Jolly Light Theme

To keep your website's syntax highlighting in sync with the Jolly Light theme:

1. **Edit theme**: Modify `~/Sean/jolly/themes/jolly-light-color-theme.json`
2. **Regenerate colors**: Run `npm run color_code` (or full `npm run build`)
3. **Rebuild site**: Run `hugo` to see changes

The theme colors are automatically extracted and applied to:
- Code block backgrounds (editor.background)
- All syntax token types (comments, keywords, strings, etc.)
- Tree-sitter semantic highlighting classes

## Troubleshooting

**Colors not updating?**
- Run `npm run color_code` to regenerate the SCSS
- Clear Hugo's cache: `hugo --gc`
- Check that `_jolly-theme-generated.scss` exists and has recent timestamp

**Syntax highlighting not working?**
- Ensure you're editing `.md.code` files, not `.md` files
- Run `npm run preprocess` to regenerate `.md` files
- Check that Tree-sitter parsers are installed: `npm install`
- Verify language is supported in `highlight-treesitter.js`
- Check console output for Tree-sitter errors

**`.md` file missing after creating `.md.code`?**
- Run `npm run preprocess` or `npm run build`
- Check that `.md.code` file has code blocks (files without code blocks aren't processed)

**Build fails?**
- Ensure Python 3 is installed: `python3 --version`
- Ensure Node.js is installed: `node --version`
- Check theme file exists: `~/Sean/jolly/themes/jolly-light-color-theme.json`
- Verify Hugo extended version is installed: `hugo version`

**I accidentally edited a `.md` file?**
- Don't worry! Just run `npm run preprocess` to regenerate from `.md.code`
- Your changes will be overwritten (that's why we edit `.md.code` instead)
