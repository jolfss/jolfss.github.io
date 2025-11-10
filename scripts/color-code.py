#!/usr/bin/env python3
"""
VS Code Theme → SCSS Converter (Color Code Generator)

Converts a VS Code color theme JSON to SCSS variables for Hugo syntax highlighting.
Maps semantic token colors to Tree-sitter CSS classes.

Usage: python3 scripts/color-code.py
       npm run color_code
"""

import json
import os
from datetime import datetime
from pathlib import Path

# Configuration
THEME_PATH = Path(__file__).parent.parent / "themes" / "jolly-light-color-theme.json"
OUTPUT_PATH = Path(__file__).parent.parent / "assets" / "scss" / "base" / "_jolly-theme-generated.scss"

# Maps VS Code semantic token types to Tree-sitter CSS class variables
TOKEN_MAPPING = {
    # Comments
    'comment': 'comment',

    # Keywords and control flow
    'keyword': 'keyword',

    # Strings
    'string': 'string',

    # Numbers
    'number': 'number',

    # Booleans and null
    'builtinConstant': 'boolean',

    # Functions and methods
    'function': 'function-name',
    'magicFunction': 'method-name',
    'method': 'method-name',

    # Types and classes
    'class': 'type',
    'class.declaration': 'type',
    'enum': 'type',
    'enum.declaration': 'type',
    'interface': 'type',
    'interface.declaration': 'type',
    'struct': 'type',
    'struct.declaration': 'type',
    'type': 'type',
    'typeParameter': 'parameter',

    # Variables and parameters
    'variable': 'variable',
    'variable.readonly': 'variable',
    'parameter': 'parameter',

    # Properties
    'property': 'property',
    'enumMember': 'property',

    # Operators
    'operator': 'operator',

    # Decorators
    'decorator': 'decorator',

    # Regular expressions
    'regexp': 'regexp',

    # Macros
    'macro': 'macro',

    # Namespaces
    'namespace': 'namespace',
    'module': 'namespace',

    # Labels
    'label': 'label',
}

# Map TextMate scopes to our token types
SCOPE_MAPPING = {
    'comment': 'comment',
    'string': 'string',
    'constant.numeric': 'number',
    'constant.language': 'boolean',
    'keyword': 'keyword',
    'storage.type': 'keyword',
    'entity.name.function': 'function-name',
    'entity.name.type': 'type',
    'support.class': 'type',
    'support.type': 'type',
    'variable.parameter': 'parameter',
    'variable.other.property': 'property',
    'keyword.operator': 'operator',
    'entity.name.function.decorator': 'decorator',
    'string.regexp': 'regexp',
    'entity.name.namespace': 'namespace',
}


def extract_semantic_colors(theme):
    """Extracts colors from VS Code theme's semanticTokenColors"""
    colors = {}
    semantic_token_colors = theme.get('semanticTokenColors', {})

    for token_type, color in semantic_token_colors.items():
        # Handle both string colors and objects with foreground
        color_value = color if isinstance(color, str) else color.get('foreground')

        if color_value and token_type in TOKEN_MAPPING:
            variable_name = TOKEN_MAPPING[token_type]
            colors[variable_name] = color_value

    return colors


def extract_token_colors(theme):
    """Extracts colors from VS Code theme's tokenColors (TextMate grammar)"""
    colors = {}
    token_colors = theme.get('tokenColors', [])

    for rule in token_colors:
        if not rule.get('scope') or not rule.get('settings') or not rule['settings'].get('foreground'):
            continue

        scopes = rule['scope'] if isinstance(rule['scope'], list) else [rule['scope']]

        for scope in scopes:
            if scope in SCOPE_MAPPING:
                variable_name = SCOPE_MAPPING[scope]
                # Only set if not already set (semantic colors take precedence)
                if variable_name not in colors:
                    colors[variable_name] = rule['settings']['foreground']

    return colors


def generate_scss(theme):
    """Generates SCSS content from color mappings"""
    # Extract colors from both sources
    semantic_colors = extract_semantic_colors(theme)
    token_colors = extract_token_colors(theme)

    # Merge: semantic colors take precedence
    all_colors = {**token_colors, **semantic_colors}

    # Get editor background
    editor_background = theme.get('colors', {}).get('editor.background', '#ffffff')
    editor_foreground = theme.get('colors', {}).get('editor.foreground', '#000000')

    # Generate SCSS
    scss = f"""/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * Generated from: {THEME_PATH.name}
 * Generated at: {datetime.now().isoformat()}
 *
 * To regenerate: npm run color_code
 */

// Import typography variables for font weights
@import 'typography';

// Theme: {theme.get('name', 'Custom Theme')}
// Type: {theme.get('type', 'light')}

// Editor colors
$jolly-editor-bg: {editor_background};
$jolly-editor-fg: {editor_foreground};

// Syntax highlighting colors (mapped from VS Code semantic tokens)
"""

    # Add all color variables
    sorted_colors = sorted(all_colors.items())

    for token_type, color in sorted_colors:
        variable_name = f"$jolly-syntax-{token_type}"
        scss += f"{variable_name}: {color};\n"

    # Add fallbacks for any missing colors
    required_tokens = [
        'comment', 'keyword', 'string', 'number', 'boolean', 'null',
        'function-name', 'method-name', 'type', 'parameter', 'variable',
        'property', 'operator', 'punctuation', 'decorator', 'regexp',
        'macro', 'namespace', 'label', 'builtin'
    ]

    scss += '\n// Fallback colors (using editor foreground or sensible defaults)\n'

    for token in required_tokens:
        if token not in all_colors:
            variable_name = f"$jolly-syntax-{token}"
            scss += f"{variable_name}: {editor_foreground} !default;\n"

    scss += '\n// Export as CSS custom properties\n'
    scss += ':root {\n'
    scss += f'    --color-code-bg: {editor_background};\n'
    scss += f'    --color-syntax-foreground: {editor_foreground};\n'
    scss += '\n'

    # Export all syntax colors as CSS variables
    for token_type, _ in sorted_colors:
        css_var = f"--color-syntax-{token_type}"
        scss_var = f"$jolly-syntax-{token_type}"
        scss += f"    {css_var}: #{{{scss_var}}};\n"

    # Add fallbacks
    for token in required_tokens:
        if token not in all_colors:
            css_var = f"--color-syntax-{token}"
            scss_var = f"$jolly-syntax-{token}"
            scss += f"    {css_var}: #{{{scss_var}}};\n"

    scss += '}\n'

    # Generate CSS classes for semantic token types
    scss += '\n// Semantic token CSS classes (auto-generated from theme)\n'
    scss += '// These map to VS Code semantic token types\n\n'

    semantic_token_colors = theme.get('semanticTokenColors', {})
    for token_type, color_value in sorted(semantic_token_colors.items()):
        # Extract color (could be string or dict with foreground)
        color = color_value if isinstance(color_value, str) else color_value.get('foreground', editor_foreground)

        # Convert token type to CSS class name
        # e.g., 'class.declaration' → '.ts-class-declaration'
        #       'magicFunction' → '.ts-magic-function'
        css_class = token_type.replace('.', '-').replace('*', 'any')
        # Convert camelCase to kebab-case
        import re
        css_class = re.sub(r'([a-z])([A-Z])', r'\1-\2', css_class).lower()

        scss += f'.ts-{css_class} {{\n'
        scss += f'    color: {color};\n'

        # Add font-weight for certain token types
        bold_types = ['function', 'method', 'class', 'type', 'namespace', 'macro']
        if any(bt in token_type.lower() for bt in bold_types):
            scss += f'    font-weight: $font-weight-semibold;\n'

        # Add italic for comments and decorators
        if 'comment' in token_type.lower() or 'decorator' in token_type.lower():
            scss += f'    font-style: italic;\n'

        scss += '}\n\n'

    return scss


def main():
    print('═══════════════════════════════════════════════════')
    print('  VS Code Theme → SCSS Converter')
    print('═══════════════════════════════════════════════════\n')

    # Read theme file
    print(f"Reading theme: {THEME_PATH}")

    if not THEME_PATH.exists():
        print(f"✗ Theme file not found: {THEME_PATH}")
        print('\nPlease ensure the Jolly theme is in the repository:')
        print('  themes/jolly-light-color-theme.json')
        return 1

    with open(THEME_PATH, 'r') as f:
        theme = json.load(f)

    print(f"✓ Loaded theme: {theme.get('name', 'Unknown')}")
    print(f"  Type: {theme.get('type', 'unknown')}")

    # Extract colors
    semantic_colors = extract_semantic_colors(theme)
    token_colors = extract_token_colors(theme)

    print(f"\n✓ Extracted {len(semantic_colors)} semantic token colors")
    print(f"✓ Extracted {len(token_colors)} TextMate token colors")

    # Generate SCSS
    scss = generate_scss(theme)

    # Ensure output directory exists
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    # Write output
    with open(OUTPUT_PATH, 'w') as f:
        f.write(scss)

    print(f"\n✓ Generated SCSS: {OUTPUT_PATH}")
    print(f"  {len(scss.splitlines())} lines")

    print('\n═══════════════════════════════════════════════════')
    print('✓ Theme conversion complete!')
    print('═══════════════════════════════════════════════════')

    return 0


if __name__ == '__main__':
    exit(main())
