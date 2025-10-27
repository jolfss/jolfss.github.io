/**
 * Maps Tree-sitter AST patterns to VS Code semantic token types
 *
 * This provides the semantic analysis layer that maps syntax tree patterns
 * to semantic token types (function, class, parameter, etc.) which are then
 * colored according to the theme's semanticTokenColors.
 *
 * Based on VS Code's semantic token provider pattern.
 */

const fs = require('fs');
const path = require('path');

// Load Jolly Light theme
const THEME_PATH = path.join(require('os').homedir(), 'Sean/jolly/themes/jolly-light-color-theme.json');
let THEME = null;

try {
    THEME = JSON.parse(fs.readFileSync(THEME_PATH, 'utf8'));
} catch (error) {
    console.warn('Warning: Could not load Jolly Light theme, using defaults');
}

/**
 * Get color for a semantic token type from the theme
 */
function getColorForToken(tokenType) {
    if (!THEME || !THEME.semanticTokenColors) {
        return null;
    }

    const color = THEME.semanticTokenColors[tokenType];
    if (typeof color === 'string') {
        return color;
    } else if (color && color.foreground) {
        return color.foreground;
    }
    return null;
}

/**
 * Analyzes a Tree-sitter node and determines its semantic token type
 * Returns the token type (e.g., 'function', 'class.declaration', 'parameter')
 */
function getSemanticTokenType(node) {
    const nodeType = node.type;
    const parent = node.parent;
    const grandparent = parent?.parent;

    // Python-specific semantic analysis
    if (nodeType === 'identifier') {
        // Function definition: (function_definition name: (identifier))
        if (parent?.type === 'function_definition') {
            const nameNode = parent.childForFieldName('name');
            if (nameNode && node.startIndex === nameNode.startIndex && node.endIndex === nameNode.endIndex) {
                // Use 'function' for definition (theme might have 'function.declaration')
                return 'function';
            }
        }

        // Class definition: (class_definition name: (identifier))
        if (parent?.type === 'class_definition') {
            const nameNode = parent.childForFieldName('name');
            if (nameNode && node.startIndex === nameNode.startIndex && node.endIndex === nameNode.endIndex) {
                return 'class.declaration';  // This is a definition
            }
        }

        // Method definition (function inside a class)
        if (parent?.type === 'function_definition') {
            // Check if this function is inside a class
            let ancestor = parent.parent;
            while (ancestor) {
                if (ancestor.type === 'class_definition' || ancestor.type === 'decorated_definition') {
                    const nameNode = parent.childForFieldName('name');
                    if (nameNode && node.startIndex === nameNode.startIndex && node.endIndex === nameNode.endIndex) {
                        // Check for magic methods
                        if (node.text && node.text.startsWith('__') && node.text.endsWith('__')) {
                            return 'magicFunction';
                        }
                        return 'method';
                    }
                }
                ancestor = ancestor.parent;
            }
        }

        // Decorator: @decorator_name (must check before function call)
        if (parent?.type === 'decorator') {
            // The identifier inside a decorator is the decorator function name
            return 'function.decorator';
        }

        // Function call: (call function: (identifier))
        if (parent?.type === 'call') {
            const funcNode = parent.childForFieldName('function');
            if (funcNode && node.startIndex === funcNode.startIndex && node.endIndex === funcNode.endIndex) {
                // All functions use 'function' - builtins get same color from theme
                return 'function';
            }
        }

        // Attribute access: (attribute attribute: (identifier))
        if (parent?.type === 'attribute') {
            const attrNode = parent.childForFieldName('attribute');
            if (attrNode && node.startIndex === attrNode.startIndex && node.endIndex === attrNode.endIndex) {
                // Check if it's a method call
                const grandFuncNode = grandparent?.childForFieldName('function');
                if (grandparent?.type === 'call' && grandFuncNode &&
                    parent.startIndex === grandFuncNode.startIndex && parent.endIndex === grandFuncNode.endIndex) {
                    return 'method';
                }
                return 'property';
            }
        }

        // Module/namespace in import: from module import ...
        if (parent?.type === 'dotted_name' && grandparent?.type === 'import_from_statement') {
            return 'module';
        }

        // Check if it's being imported
        if (parent?.type === 'aliased_import' || grandparent?.type === 'import_statement') {
            return 'module';
        }

        // Type annotation: name: type or -> type
        if (parent?.type === 'type') {
            // All types (builtin or custom) use 'class' for type references
            return 'class';
        }

        // Parameter in function definition
        // Check if we're a direct child of a parameter node
        if (parent?.type === 'typed_parameter' || parent?.type === 'default_parameter' ||
            parent?.type === 'typed_default_parameter' || parent?.type === 'identifier') {
            // The first child of typed_parameter/default_parameter is usually the parameter name
            if (parent.type !== 'identifier' && parent.child(0) === node) {
                return 'parameter';
            }
            // Also check if grandparent is parameters
            if (grandparent?.type === 'parameters' || grandparent?.type === 'lambda_parameters') {
                return 'parameter';
            }
        }

        // Simple parameter (no type annotation) - direct child of parameters
        if (parent?.type === 'parameters' || parent?.type === 'lambda_parameters') {
            return 'parameter';
        }

        // Check for constants (ALL_CAPS naming convention)
        if (node.text && node.text === node.text.toUpperCase() && node.text.length > 1 && /^[A-Z_]+$/.test(node.text)) {
            return 'variable.readonly';  // or could use 'builtinConstant'
        }

        // Check for special constants
        const specialConstants = ['True', 'False', 'None'];
        if (node.text && specialConstants.includes(node.text)) {
            return 'builtinConstant';
        }

        // Default: regular variable
        return 'variable';
    }

    // Decorator nodes
    if (nodeType === 'decorator' || nodeType === '@') {
        return 'decorator';
    }

    return null;
}

module.exports = {
    getSemanticTokenType,
    getColorForToken,
    THEME
};