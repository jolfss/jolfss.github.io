# Code Syntax Highlighting

This site supports syntax highlighting for code blocks using Hugo's built-in Chroma highlighter.

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
from x import y

for i in range(10):
    print(f"Iteration {i}")
```
````

**Renders as:**

```python
from x import y

for i in range(10):
    print(f"Iteration {i}")
```

### Automatic Language Detection

Hugo can guess the language if you omit the identifier (enabled with `guessSyntax = true`):

````markdown
```
def hello_world():
    print("Hello!")
```
````

However, **explicitly specifying the language is recommended** for accuracy.

## Supported Languages

Hugo's Chroma highlighter supports 200+ languages. Common ones include:

| Language | Identifier |
|----------|------------|
| Python | `python` |
| JavaScript | `javascript`, `js` |
| TypeScript | `typescript`, `ts` |
| Go | `go` |
| Rust | `rust` |
| C/C++ | `c`, `cpp` |
| Java | `java` |
| HTML | `html` |
| CSS | `css` |
| Bash/Shell | `bash`, `sh` |
| SQL | `sql` |
| JSON | `json` |
| YAML | `yaml` |
| Markdown | `markdown`, `md` |

For a full list, see [Chroma language identifiers](https://github.com/alecthomas/chroma#supported-languages).

## Configuration

### Hugo Settings (`hugo.toml`)

```toml
[markup.highlight]
  anchorLineNos = false       # No anchor links on line numbers
  codeFences = true           # Enable ``` code blocks
  guessSyntax = true          # Auto-detect language if not specified
  lineNos = false             # No line numbers by default
  lineNumbersInTable = false  # Use simple line numbers (not table-based)
  noClasses = true            # Use inline styles (no external CSS)
  style = 'github'            # Use GitHub color scheme
  tabWidth = 4                # Tab character width
```

### Typography Styles (`assets/scss/base/_typography.scss`)

Code elements use **JetBrains Mono** font:

```scss
code, pre, kbd {
  font-family: $font-jetbrains-mono;
  font-weight: $font-weight-normal;
}

code {
  background-color: rgba(var(--_color-dark), 0.05);
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
  font-size: 0.9em;
}

pre {
  overflow-x: auto;
  padding: 1rem;
  border-radius: 0.5rem;
  background-color: rgba(var(--_color-dark), 0.03);
  margin-bottom: 1rem;

  code {
    background-color: transparent;
    padding: 0;
  }
}
```

## Advanced Features

### Line Numbers

Enable line numbers for a specific code block by adding `{linenos=true}`:

````markdown
```python {linenos=true}
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)
```
````

### Line Highlighting

Highlight specific lines with `hl_lines`:

````markdown
```go {hl_lines=[2,4]}
func main() {
    fmt.Println("This line is highlighted")
    fmt.Println("This line is not")
    fmt.Println("This line is highlighted")
}
```
````

### Starting Line Number

Set a custom starting line number:

````markdown
```python {linenos=table,linenostart=42}
print("Line 42")
print("Line 43")
```
````

## Styling

### Current Theme

The site uses the **GitHub** Chroma style (`style = 'github'`), which provides:
- Clean, readable syntax colors
- Subtle contrast that works well with the grid-paper aesthetic
- Familiarity for developers

### Changing the Theme

To use a different Chroma style, edit `hugo.toml`:

```toml
[markup.highlight]
  style = 'monokai'  # Or: dracula, nord, solarized-dark, etc.
```

Available styles: `abap`, `algol`, `arduino`, `autumn`, `borland`, `bw`, `colorful`, `dracula`, `emacs`, `friendly`, `fruity`, `github`, `github-dark`, `igor`, `lovelace`, `manni`, `monokai`, `monokailight`, `murphy`, `native`, `paraiso-dark`, `paraiso-light`, `pastie`, `perldoc`, `pygments`, `rainbow_dash`, `rrt`, `solarized-dark`, `solarized-light`, `swapoff`, `tango`, `trac`, `vim`, `vs`, `xcode`.

Preview all styles at [Chroma Style Gallery](https://xyproto.github.io/splash/docs/all.html).

## Typography

Code blocks use **JetBrains Mono**, a monospace font designed for developers:
- **Increased height** for better readability
- **Distinct character shapes** (e.g., `0` vs `O`, `1` vs `l` vs `I`)
- **Programming ligatures** support (optional, not enabled by default)

The font is loaded from Google Fonts via `assets/scss/base/_typography.scss`.

## Troubleshooting

### Syntax Not Highlighting

1. **Check language identifier**: Ensure it matches a supported Chroma language
2. **Verify triple backticks**: Make sure you're using `` ``` `` not single backticks
3. **Hugo version**: Requires Hugo v0.60.0+ for Chroma support

### Code Block Overflow

Long lines will scroll horizontally (`overflow-x: auto` on `<pre>` elements). Consider:
- Breaking long lines manually
- Using shorter variable names
- Enabling line wrapping (requires custom CSS)

### Font Not Loading

If JetBrains Mono doesn't load:
1. Check browser console for font loading errors
2. Verify Google Fonts is accessible
3. Check `assets/scss/base/_typography.scss` for the `@import` statement
