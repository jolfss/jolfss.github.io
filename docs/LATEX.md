# LaTeX Support

This site supports rendering mathematical equations using LaTeX syntax via MathJax 3.

## Usage

### Inline Math

Use single dollar signs for inline math that flows with text:

```markdown
This is an inline equation: $E = mc^2$ in the text.
```

**Renders as:** This is an inline equation: $E = mc^2$ in the text.

### Display Math (Block)

Use double dollar signs for centered display equations:

```markdown
$$
Q^\pi(s,a) = r(s,a) + \gamma\underset{s'\sim P(s'|s,a)}{\mathbb{E}}[Q^\pi(s',\pi(s'))]
$$
```

**Renders as:**

$$
Q^\pi(s,a) = r(s,a) + \gamma\underset{s'\sim P(s'|s,a)}{\mathbb{E}}[Q^\pi(s',\pi(s'))]
$$

### LaTeX Environments

MathJax supports standard LaTeX environments:

```latex
$$
\begin{align}
  f(x) &= x^2 + 2x + 1 \\
       &= (x + 1)^2
\end{align}
$$
```

## Implementation Details

### Configuration

The LaTeX rendering is configured in `layouts/baseof.html`:

```html
<script>
MathJax = {
    tex: {
        inlineMath: [['$', '$']],
        displayMath: [['$$', '$$']],
        processEscapes: true,
        processEnvironments: true
    },
    options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
    }
};
</script>
<script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>
```

### Hugo Goldmark Configuration

Hugo's Goldmark markdown processor is configured to pass through LaTeX delimiters without processing them (`hugo.toml`):

```toml
[markup.goldmark.extensions.passthrough]
  enable = true
  [markup.goldmark.extensions.passthrough.delimiters]
    block = [['$$', '$$']]
    inline = [['$', '$']]
```

This prevents Hugo from interpreting `$` signs as markdown syntax.

## Common LaTeX Commands

| Syntax | Result | Description |
|--------|--------|-------------|
| `x^2` | $x^2$ | Superscript |
| `x_i` | $x_i$ | Subscript |
| `\frac{a}{b}` | $\frac{a}{b}$ | Fraction |
| `\sqrt{x}` | $\sqrt{x}$ | Square root |
| `\sum_{i=1}^n` | $\sum_{i=1}^n$ | Summation |
| `\int_a^b` | $\int_a^b$ | Integral |
| `\mathbb{R}` | $\mathbb{R}$ | Blackboard bold |
| `\alpha, \beta` | $\alpha, \beta$ | Greek letters |

## Troubleshooting

### Math Not Rendering

1. **Check delimiters**: Ensure you're using `$` for inline and `$$` for display math
2. **Escape special characters**: Use backslash before special markdown characters within math
3. **Browser console**: Check for MathJax errors in browser developer tools

### Rendering Performance

- MathJax loads asynchronously (`async` attribute) to avoid blocking page render
- Complex equations may cause brief layout shifts during rendering
- Consider using display math for complex equations to minimize inline layout shifts
