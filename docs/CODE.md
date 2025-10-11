# Code Syntax Highlighting

This site uses **Tree-sitter** for VS Code-quality syntax highlighting, with fallback to Hugo's Chroma highlighter for unsupported languages.

## Architecture Overview

The syntax highlighting system mimics VS Code's architecture:

1. **Tree-sitter Parsing**: Code blocks are parsed at build time using Tree-sitter (same parser used by VS Code, GitHub, Neovim)
2. **Semantic Tokens**: Tokens are mapped to VS Code-style semantic token types (`ts-keyword`, `ts-function-name`, etc.)
3. **Theme-Independent**: Syntax colors are defined via CSS custom properties in `_themes.scss`
4. **Fallback to Chroma**: Languages without Tree-sitter parsers fall back to Hugo's built-in Chroma highlighter

## Usage

### Inline Code

Use single backticks for inline code:

```markdown
Use the `print()` function to output text.
```

**Renders as:** Use the `print()` function to output text.

Inline code uses a light background with the JetBrains Mono font for readability.

### Code Blocks with Syntax Highlighting

Use triple backticks with a language identifier:

````markdown
```python
from x import SomeType

type MyType[X : SomeType](Protocol):
    def cast(self, x: X) -> SomeType:
        """Casts x to SomeType."""
        ...
```
````

**Renders as:**

```python
from x import SomeType

type MyType[X : SomeType](Protocol):
    def cast(self, x: X) -> SomeType:
        """Casts x to SomeType."""
        ...
```

## Supported Languages

### Tree-sitter Languages (High Accuracy)

Languages highlighted with Tree-sitter get VS Code-level accuracy:

| Language | Identifiers | Status |
|----------|-------------|--------|
| Python | `python` | ✓ Supported |
| JavaScript | `javascript`, `js` | ✓ Supported |
| TypeScript | `typescript`, `ts`, `tsx` | ✓ Supported |
| Rust | `rust` | ✓ Supported |
| Go | `go` | ✓ Supported |
| C | `c` | ✓ Supported |
| C++ | `cpp` | ✓ Supported |
| Java | `java` | ✓ Supported |
| Bash | `bash`, `sh` | ✓ Supported |
| HTML | `html` | ✓ Supported |
| CSS | `css` | ✓ Supported |
| JSON | `json` | ✓ Supported |

To add more Tree-sitter languages:
```bash
npm install tree-sitter-<language>
```

Then add to `scripts/highlight-treesitter.js` language registry.

### Chroma Fallback Languages

Languages not in the Tree-sitter registry fall back to Chroma (200+ languages). Common ones:

- SQL (`sql`)
- PHP (`php`)
- Ruby (`ruby`)
- Perl (`perl`)
- LaTeX (`latex`)
- Markdown (`markdown`, `md`)

For a full list, see [Chroma language identifiers](https://github.com/alecthomas/chroma#supported-languages).

## How It Works

### Build Process

1. **Pre-processing** (`npm run highlight`):
   - Script scans `content/**/*.md` for code blocks
   - Parses supported languages with Tree-sitter
   - Generates `<span class="ts-keyword">` HTML
   - Replaces markdown code blocks with pre-rendered HTML

2. **Hugo Build**:
   - Processes markdown (sees pre-rendered HTML for Tree-sitter blocks)
   - Falls back to Chroma for unsupported languages
   - Applies SCSS styling

3. **Result**: Static HTML with semantic token classes

### File Structure

```
scripts/
  ├── highlight-treesitter.js   # Main pre-processing script
  └── token-map.js               # Tree-sitter → CSS class mapping

assets/scss/base/
  ├── _syntax-treesitter.scss    # Semantic token styles
  └── _themes.scss               # Color definitions (theme)

package.json                     # Tree-sitter dependencies
```

## Theming

### Changing Colors

Syntax colors are defined in `assets/scss/base/_themes.scss`:

```scss
$theme-light: (
    // ... other colors ...

    // Syntax colors (VS Code Light+ inspired)
    color-syntax-keyword: #0000FF,      // Blue
    color-syntax-string: #A31515,       // Dark red
    color-syntax-number: #098658,       // Teal green
    color-syntax-comment: #6A9955,      // Muted green
    color-syntax-function-name: #795E26, // Brown/gold
    color-syntax-type: #267F99,         // Cyan blue
    // ... more tokens ...
);
```

To create a custom theme:
1. Modify color values in `_themes.scss`
2. Rebuild: `hugo`

### Matching a VS Code Theme

To extract colors from a VS Code theme:

1. Open VS Code with your desired theme
2. `Cmd+Shift+P` → "Developer: Generate Color Theme From Current Settings"
3. Look at the `tokenColors` array
4. Map scopes to semantic token types:

| VS Code Scope | Tree-sitter Token | CSS Variable |
|---------------|-------------------|--------------|
| `keyword.control` | `ts-keyword` | `color-syntax-keyword` |
| `string.quoted` | `ts-string` | `color-syntax-string` |
| `comment.line` | `ts-comment` | `color-syntax-comment` |
| `entity.name.function` | `ts-function-name` | `color-syntax-function-name` |
| `entity.name.type` | `ts-type` | `color-syntax-type` |
| `constant.numeric` | `ts-number` | `color-syntax-number` |

### Background Color Control

Code block backgrounds are **independent** from syntax colors:

```scss
$theme-light: (
    // ...
    color-code-bg: rgba($color-dark-blue, 0.03),        // Block background
    color-code-inline-bg: rgba($color-dark-blue, 0.05), // Inline background
);
```

Change these to control background without affecting syntax highlighting.

## Token Mapping

Tree-sitter node types are mapped to CSS classes in `scripts/token-map.js`:

```javascript
module.exports = {
    // Keywords
    'keyword': 'ts-keyword',
    'if': 'ts-keyword',
    'for': 'ts-keyword',

    // Strings
    'string': 'ts-string',
    'string_content': 'ts-string',

    // Functions
    'function_name': 'ts-function-name',
    'call': 'ts-function-call',

    // ... 100+ mappings
};
```

This universal mapping works across all Tree-sitter languages because node types are similar (e.g., all languages have `keyword`, `string`, `comment` nodes).

## Local Development

### Running the Highlighter Locally

```bash
# Install dependencies
npm install

# Run Tree-sitter highlighting
npm run highlight

# Build site
hugo server
```

### Adding a New Language

1. **Install Tree-sitter parser**:
   ```bash
   npm install tree-sitter-<language>
   ```

2. **Add to language registry** (`scripts/highlight-treesitter.js`):
   ```javascript
   const LANGUAGES = {
       // ... existing languages ...
       ruby: { parser: null, module: 'tree-sitter-ruby' },
   };
   ```

3. **Test**:
   ```bash
   npm run highlight
   hugo server
   ```

4. **Customize colors** (optional): Adjust token colors in `_themes.scss`

## Typography

Code blocks use **JetBrains Mono**, a monospace font designed for developers:
- **Increased height** for better readability
- **Distinct character shapes** (e.g., `0` vs `O`, `1` vs `l` vs `I`)
- **Programming ligatures** support (not enabled by default)

The font is loaded from Google Fonts via `assets/scss/base/_typography.scss`.

## Configuration

### Hugo Settings (`hugo.toml`)

```toml
[markup.highlight]
  anchorLineNos = false
  codeFences = true
  guessSyntax = true
  lineNos = false
  lineNumbersInTable = false
  noClasses = true            # For Chroma fallback
  style = 'github'            # For Chroma fallback
  tabWidth = 4
```

### Package Scripts (`package.json`)

```json
{
  "scripts": {
    "highlight": "node scripts/highlight-treesitter.js",
    "build": "npm run highlight && hugo --gc --minify"
  }
}
```

## CI/CD Integration

The GitHub Actions workflow (`.github/workflows/hugo.yml`) runs Tree-sitter highlighting before building:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'

- name: Install Node.js dependencies
  run: npm install

- name: Run Tree-sitter syntax highlighting
  run: npm run highlight

- name: Build with Hugo
  run: hugo --gc --minify --baseURL "..."
```

## Troubleshooting

### Tree-sitter Not Highlighting

If a code block isn't highlighting:

1. **Check language identifier**: Must match a key in the language registry
2. **Check installation**: Run `npm install` to ensure parsers are installed
3. **Check console output**: Run `npm run highlight` locally to see errors
4. **Verify HTML**: Inspect page source for `<span class="ts-*">` tags

### Syntax Colors Not Applying

1. **Check SCSS import**: Ensure `@import 'base/syntax-treesitter';` is in `main.scss`
2. **Check CSS variables**: Verify colors are defined in `_themes.scss`
3. **Check browser console**: Look for CSS loading errors
4. **Clear cache**: Run `hugo --gc` to rebuild CSS

### Code Block Overflow

Long lines will scroll horizontally (`overflow-x: auto`). Consider:
- Breaking long lines manually
- Using shorter variable names
- Enabling line wrapping (requires custom CSS)

### Build Errors

If the highlighting script fails:

```bash
# Check for syntax errors
node scripts/highlight-treesitter.js

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check Node version (requires 18+)
node --version
```

## Performance

### Build Times

- **Tree-sitter parsing**: ~1-5ms per code block
- **Total overhead**: Typically <1s for most sites
- **Result**: Static HTML (zero runtime cost)

### Comparison to Chroma

| Metric | Tree-sitter | Chroma |
|--------|-------------|--------|
| **Accuracy** | Excellent (AST-based) | Good (regex-based) |
| **Build time** | ~1s overhead | Instant |
| **Runtime** | Zero | Zero |
| **Extensibility** | Add npm packages | Limited |
| **Theme control** | Full CSS control | Limited |

## Advanced Topics

### Custom Token Types

To add new token types:

1. **Add to token map** (`scripts/token-map.js`):
   ```javascript
   'my_custom_node': 'ts-custom',
   ```

2. **Add styles** (`assets/scss/base/_syntax-treesitter.scss`):
   ```scss
   .ts-custom {
       color: var(--color-syntax-custom);
   }
   ```

3. **Add color** (`assets/scss/base/_themes.scss`):
   ```scss
   $theme-light: (
       color-syntax-custom: #FF00FF,
   );
   ```

### Tree-sitter Queries

For advanced customization, you can use Tree-sitter queries to capture specific patterns. See [Tree-sitter query documentation](https://tree-sitter.github.io/tree-sitter/using-parsers#pattern-matching-with-queries).

### Creating Dark Themes

Add a dark theme by duplicating `$theme-light` and defining a media query:

```scss
$theme-dark: (
    color-code-bg: rgba(white, 0.05),
    color-syntax-keyword: #569CD6,      // Lighter blue
    color-syntax-string: #CE9178,       // Light red
    // ... adjust all colors for dark background ...
);

@media (prefers-color-scheme: dark) {
    :root {
        @include emit-theme-vars($theme-dark);
    }
}
```
