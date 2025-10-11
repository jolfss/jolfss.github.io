# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal portfolio website built with Hugo (static site generator) and deployed to GitHub Pages. The site showcases Sean Brynjólfsson's projects, bio, and blog content with a custom-designed theme featuring a grid-paper aesthetic.

## Build and Development Commands

**Note**: Hugo is not currently installed locally but is used in CI/CD. The GitHub Actions workflow uses Hugo v0.147.2 (extended version) and Dart Sass.

### Local Development
```bash
# Install Hugo Extended (required for SCSS processing)
# On macOS: brew install hugo
# On Linux: wget and dpkg install from GitHub releases

# Run development server with live reload
hugo server

# Build site for production (output to ./public/)
hugo --gc --minify
```

### Deployment
The site auto-deploys to GitHub Pages via `.github/workflows/hugo.yml` on pushes to `main`. The workflow:
1. Builds with Hugo Extended (v0.147.2)
2. Uses Dart Sass for SCSS compilation
3. Applies minification and garbage collection
4. Uploads to GitHub Pages

## Architecture

### Content Structure
- `content/`: Markdown content files
  - `_index.md`: Homepage with bio, welcome text, and featured projects
  - `projects/*/index.md`: Individual project pages with frontmatter (`featured`, `date`, `title`, `description`, `media`, `links`)
  - `blog/`: Blog posts (section)
  - `pebbles/`: Short-form content (section)

### Layout System
Hugo uses a hierarchical template system:
- `layouts/baseof.html`: Base template wrapping all pages
  - Loads SCSS via Hugo Pipes (`resources.Get "scss/main.scss" | toCSS | minify | fingerprint`)
  - Injects JavaScript modules (`rem-height-ceil.js`, `image-preview.js`)
  - Applies body class based on page type (`page-home`, `page-{section}`)
- `layouts/index.html`: Homepage-specific layout
  - Renders welcome card with portrait and bio
  - Queries and displays featured projects (sorted by date, limited to 10)
- `layouts/section.html`, `layouts/single.html`: Content page layouts
- `layouts/_partials/`: Reusable components (header, footer)

### Styling Architecture (SCSS)
The stylesheet is organized into a modular ITCSS-inspired structure via `assets/scss/main.scss`:

1. **Base Layer** (`base/`):
   - `_reset.scss`: CSS normalization
   - `_themes.scss`: Theme system with CSS custom properties
     - Uses `emit-theme-vars()` mixin to generate `--color-*` and `--_color-*` (RGB) variables
     - Currently implements light theme only (dark theme commented out)
   - `_base.scss`: Core layout rules
     - Grid-paper background (2rem × 2rem grid via `repeating-linear-gradient`)
     - Max content width: 58rem, mobile breakpoint: 812px
     - Grid spacing constant: `$grid-spacing: 2rem`
   - `_typography.scss`: Font styles

2. **UI Layer** (`ui/`):
   - `_mixins.scss`: Reusable SCSS mixins
   - `_panels.scss`: Panel components (`p-card`, `p-quote`)
     - **Panel System Invariant**: All panels must maintain grid alignment (top and bottom margin edges align to 2rem grid)
     - `panel-base()` mixin applies standard grid spacing padding/margins
     - `p-card`: Rounded card with backdrop-filter blur, box-shadow
     - `p-quote`: Gradient background with left border accent
   - `_templates.scss`: Layout templates (e.g., `t-split-first-3`, `t-major-stack`)
   - `_components.scss`: Small UI elements (e.g., `c-squircle` for rounded images)
   - `_animate.scss`: Hover effects (e.g., `hover-nudge`)

3. **Layout Layer** (`layout/`): Header, footer, section-specific styles

4. **Page Layer** (`pages/`): Page-specific overrides (e.g., `_home.scss`)

### JavaScript Modules
- `assets/js/rem-height-ceil.js`: Dynamically adjusts heights of `.rem-height-ceil-js` elements to nearest 2rem multiple (maintains grid alignment)
  - Runs on page load and window resize (debounced 50ms)
  - Critical for maintaining panel grid alignment invariant
- `assets/js/image-preview.js`: Image interaction functionality

### Key Design Constraints
1. **Grid Alignment**: All panels must align to the 2rem background grid. This is enforced by:
   - `$grid-spacing: 2rem` constant in `_base.scss`
   - `panel-base()` mixin applying padding/margins
   - `rem-height-ceil.js` script adjusting heights to 2rem multiples
2. **Responsive Design**: Mobile breakpoint at 812px (`$mobile-breakpoint`)
3. **Theme System**: Uses CSS custom properties with RGB decomposition for alpha channel manipulation

## Project-Specific Patterns

### Adding New Projects
1. Create `content/projects/{project-name}/index.md`
2. Set frontmatter:
   - `featured: true` to display on homepage
   - `date`: Determines sort order
   - `media`: Array of images (relative paths to project directory)
   - `description`: Markdown content rendered inline
3. Place images in same directory as `index.md`

### Modifying Styles
- Always reference `$grid-spacing` for spacing (never hardcode `2rem`)
- When creating new panel variants, use `panel-base()` mixin to maintain grid alignment
- Theme colors are in `_themes.scss`; use CSS custom properties (`var(--color-*)`) in other files
- Test that `.rem-height-ceil-js` elements maintain grid alignment after changes

### Hugo Templating Notes
- `.RenderString (dict "display" "block")`: Renders markdown with block-level elements
- `.Site.Pages.ByDate.Reverse`: Sorts pages newest-first
- `where .Site.Pages "Section" "projects"`: Filters by content section
- `$page.RelPermalink`: Gets page-relative URL for assets
