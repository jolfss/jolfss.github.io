# Hugo Build Scripts

This directory contains scripts for generating and processing content for the Hugo static site.

## Overview

The build system uses a two-stage compilation process:

1. **Source files** (`content/*.md`) → **Processed files** (`build/content/*.md`) via `process-blocks.js`
2. **Processed files** → **Static site** (`public/`) via Hugo

This allows grid-aligned block-based layouts with Tree-sitter syntax highlighting.

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

### `process-blocks.js` ⭐ **Primary Build Script**

Processes markdown source files with block-based layout system and Tree-sitter syntax highlighting.

**Input**: `content/**/*.md` (source files, committed to git)
**Output**: `build/content/**/*.md` (processed files for Hugo)

**Usage**:
```bash
node scripts/process-blocks.js
# or
npm run process_blocks
```

**How it works**:
1. Scans all `.md` files in `content/`
2. Splits content on `---` delimiters (ignoring frontmatter)
3. Detects panel type via `<!-- panel: p-card -->` comments (defaults to `p-default`)
4. Applies Tree-sitter syntax highlighting to code blocks
5. Wraps each block in `<div class="rem-height-ceil-js p-{type}">...</div>`
6. Outputs to `build/content/` for Hugo to consume

**Block Syntax**:
```markdown
---
title: My Post
---
<!-- panel: p-card -->
This content will be wrapped in a p-card panel.

---
<!-- panel: p-quote -->
This will be in a p-quote panel.

---
No comment? This defaults to p-default panel.
```

**Supported languages** (for syntax highlighting):
- Python, JavaScript, TypeScript, Rust, Go, C, C++, Java
- Bash, HTML, CSS, JSON
- See `LANGUAGES` map in `highlight-treesitter.js` for full list

### `highlight-treesitter.js` (Legacy)

**Note**: This script is now integrated into `process-blocks.js`. It remains available for standalone Tree-sitter highlighting without the block system.

Pre-processes markdown source files to add Tree-sitter-based syntax highlighting to code blocks.

**Input**: `content/**/*.md.code` (legacy source files with code blocks)
**Output**: `content/**/*.md` (generated files with highlighted code)

**Usage**:
```bash
node scripts/highlight-treesitter.js
# or
npm run preprocess
```

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
2. `npm run process_blocks` - Process `content/*.md` → `build/content/*.md` with block wrapping and Tree-sitter highlighting
3. `hugo --gc --minify` - Build static site from `build/content/` → `public/`

## File Structure

### Source Files (Committed to Git)
```
content/
├── _index.md              # All .md files are now source files
├── blog/
│   ├── _index.md
│   └── post.md            # Regular markdown (committed)
└── projects/
    └── project/
        └── index.md       # Regular markdown (committed)
```

### Generated Files (Gitignored - Build Artifacts)
```
build/
└── content/
    ├── _index.md          # Processed with block wrapping
    ├── blog/
    │   ├── _index.md
    │   └── post.md        # Blocks wrapped, code highlighted
    └── projects/
        └── project/
            └── index.md   # Blocks wrapped, code highlighted

public/                    # Final static site (Hugo output)
```

## Workflow

### Creating New Content

1. **Create source file**: `content/blog/my-post.md`
```markdown
---
title: "My Post"
---
<!-- panel: p-card -->
Here's my introduction in a card panel.

---
<!-- panel: p-default -->
Here's some Python code in the default panel:

\`\`\`python
def hello():
    print("Hello, world!")
\`\`\`

---
Another block using the default panel.
```

2. **Build**: Run `npm run build` or `npm run process_blocks`
3. **Result**:
   - `build/content/blog/my-post.md` is generated with wrapped blocks and highlighted code
   - Hugo builds the final HTML to `public/`
4. **Commit**: Commit `content/blog/my-post.md` (source) to git. The `build/` and `public/` directories are gitignored.

### Block System Features

- **Grid alignment**: All blocks automatically align to the 2rem background grid
- **Automatic wrapping**: Every section between `---` becomes a grid-aligned panel
- **Panel types**: Use `<!-- panel: p-card -->`, `<!-- panel: p-quote -->`, or omit for `p-default`
- **Code highlighting**: Tree-sitter syntax highlighting is applied automatically within blocks
- **Math support**: LaTeX math (`$...$` and `$$...$$`) works within blocks

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
- Run `npm run process_blocks` to regenerate processed files
- Check that Tree-sitter parsers are installed: `npm install`
- Verify language is supported in `highlight-treesitter.js`
- Check console output for Tree-sitter errors

**Blocks not appearing?**
- Ensure you have `---` delimiters in your source markdown (after frontmatter)
- Run `npm run process_blocks` to regenerate
- Check `build/content/` to see the processed output
- Verify `.p-default` class exists in `assets/scss/ui/_panels.scss`

**Hugo can't find content?**
- Check `hugo.toml` has `contentDir = 'build/content'`
- Run `npm run process_blocks` to generate files in `build/content/`
- Ensure `build/` directory exists

**Build fails?**
- Ensure Python 3 is installed: `python3 --version`
- Ensure Node.js is installed: `node --version`
- Check theme file exists: `~/Sean/jolly/themes/jolly-light-color-theme.json`
- Verify Hugo extended version is installed: `hugo version`

**I accidentally edited a file in `build/`?**
- Don't worry! Just run `npm run process_blocks` to regenerate from source
- Your changes will be overwritten (that's why we edit `content/*.md` instead)
