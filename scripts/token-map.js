/**
 * Universal Tree-sitter token to CSS class mapping
 *
 * This maps Tree-sitter node types to VS Code-style semantic token classes.
 * Works across all Tree-sitter languages by mapping common syntactic patterns.
 *
 * Token classes follow VS Code's semantic token types:
 * https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide
 */

module.exports = {
    // Comments
    'comment': 'ts-comment',
    'line_comment': 'ts-comment',
    'block_comment': 'ts-comment',

    // Keywords
    'keyword': 'ts-keyword',
    'if': 'ts-keyword',
    'else': 'ts-keyword',
    'elif': 'ts-keyword',
    'for': 'ts-keyword',
    'while': 'ts-keyword',
    'do': 'ts-keyword',
    'return': 'ts-keyword',
    'break': 'ts-keyword',
    'continue': 'ts-keyword',
    'import': 'ts-keyword',
    'from': 'ts-keyword',
    'export': 'ts-keyword',
    'default': 'ts-keyword',
    'class': 'ts-keyword',
    'def': 'ts-keyword',
    'function': 'ts-keyword',
    'async': 'ts-keyword',
    'await': 'ts-keyword',
    'yield': 'ts-keyword',
    'try': 'ts-keyword',
    'except': 'ts-keyword',
    'finally': 'ts-keyword',
    'raise': 'ts-keyword',
    'with': 'ts-keyword',
    'as': 'ts-keyword',
    'pass': 'ts-keyword',
    'lambda': 'ts-keyword',
    'assert': 'ts-keyword',
    'del': 'ts-keyword',
    'global': 'ts-keyword',
    'nonlocal': 'ts-keyword',
    'in': 'ts-keyword',
    'is': 'ts-keyword',
    'and': 'ts-keyword',
    'or': 'ts-keyword',
    'not': 'ts-keyword',
    'let': 'ts-keyword',
    'const': 'ts-keyword',
    'var': 'ts-keyword',
    'new': 'ts-keyword',
    'this': 'ts-keyword',
    'super': 'ts-keyword',
    'static': 'ts-keyword',
    'public': 'ts-keyword',
    'private': 'ts-keyword',
    'protected': 'ts-keyword',
    'abstract': 'ts-keyword',
    'interface': 'ts-keyword',
    'enum': 'ts-keyword',
    'struct': 'ts-keyword',
    'union': 'ts-keyword',
    'type': 'ts-keyword',
    'typeof': 'ts-keyword',
    'instanceof': 'ts-keyword',
    'extends': 'ts-keyword',
    'implements': 'ts-keyword',
    'package': 'ts-keyword',
    'goto': 'ts-keyword',
    'switch': 'ts-keyword',
    'case': 'ts-keyword',

    // Strings
    'string': 'ts-string',
    'string_content': 'ts-string',
    'string_start': 'ts-string',
    'string_end': 'ts-string',
    'raw_string_literal': 'ts-string',
    'character': 'ts-string',
    'template_string': 'ts-string',

    // String interpolation
    'interpolation': 'ts-interpolation',
    'escape_sequence': 'ts-escape',

    // Numbers
    'number': 'ts-number',
    'integer': 'ts-number',
    'float': 'ts-number',
    'hex_literal': 'ts-number',
    'binary_literal': 'ts-number',
    'octal_literal': 'ts-number',

    // Booleans and constants
    'true': 'ts-boolean',
    'false': 'ts-boolean',
    'null': 'ts-null',
    'undefined': 'ts-null',
    'none': 'ts-null',
    'True': 'ts-boolean',
    'False': 'ts-boolean',
    'None': 'ts-null',

    // Functions
    'function_definition': 'ts-function-def',
    'function_declaration': 'ts-function-def',
    'method_definition': 'ts-method-def',
    'method_declaration': 'ts-method-def',
    'call': 'ts-function-call',
    'call_expression': 'ts-function-call',

    // Function/method names
    'identifier': 'ts-variable',
    'function_name': 'ts-function-name',
    'method_name': 'ts-method-name',

    // Types
    'type_identifier': 'ts-type',
    'primitive_type': 'ts-type',
    'class_name': 'ts-class',
    'interface_name': 'ts-interface',

    // Parameters
    'parameter': 'ts-parameter',
    'parameters': 'ts-parameter',
    'typed_parameter': 'ts-parameter',
    'typed_default_parameter': 'ts-parameter',

    // Properties and attributes
    'property': 'ts-property',
    'property_identifier': 'ts-property',
    'attribute': 'ts-property',
    'field': 'ts-property',
    'member_expression': 'ts-property',

    // Operators
    'operator': 'ts-operator',
    '+': 'ts-operator',
    '-': 'ts-operator',
    '*': 'ts-operator',
    '/': 'ts-operator',
    '%': 'ts-operator',
    '=': 'ts-operator',
    '==': 'ts-operator',
    '!=': 'ts-operator',
    '<': 'ts-operator',
    '>': 'ts-operator',
    '<=': 'ts-operator',
    '>=': 'ts-operator',
    '&&': 'ts-operator',
    '||': 'ts-operator',
    '!': 'ts-operator',
    '&': 'ts-operator',
    '|': 'ts-operator',
    '^': 'ts-operator',
    '~': 'ts-operator',
    '<<': 'ts-operator',
    '>>': 'ts-operator',
    '++': 'ts-operator',
    '--': 'ts-operator',
    '+=': 'ts-operator',
    '-=': 'ts-operator',
    '*=': 'ts-operator',
    '/=': 'ts-operator',

    // Punctuation
    '(': 'ts-punctuation',
    ')': 'ts-punctuation',
    '[': 'ts-punctuation',
    ']': 'ts-punctuation',
    '{': 'ts-punctuation',
    '}': 'ts-punctuation',
    ',': 'ts-punctuation',
    ';': 'ts-punctuation',
    ':': 'ts-punctuation',
    '.': 'ts-punctuation',
    '->': 'ts-punctuation',
    '=>': 'ts-punctuation',
    '...': 'ts-punctuation',

    // Decorators (Python, TypeScript)
    'decorator': 'ts-decorator',
    '@': 'ts-decorator',

    // Regex
    'regex': 'ts-regexp',
    'regex_pattern': 'ts-regexp',

    // Macros (C, Rust)
    'macro': 'ts-macro',
    'macro_invocation': 'ts-macro',

    // Namespaces
    'namespace': 'ts-namespace',
    'module': 'ts-namespace',

    // Labels
    'label': 'ts-label',

    // Builtin types/functions
    'builtin': 'ts-builtin',
    'builtin_type': 'ts-builtin-type',
};
