// ADR-0012 Consequences: "a lint check flags literal text in components". Every user-facing string comes from
// MOD-Copy (both languages) or content, so text written straight into a .tsx or .astro template is a missing
// translation. Flags template text and literal values of the text-carrying attributes (aria-label, title, alt,
// placeholder) that contain a letter. The allowlist holds glyphs that are the same in every language.
// A local rule (no new dependency): astro-eslint-parser gives .astro templates the same JSX nodes as .tsx.
const TEXT_ATTRS = new Set(['aria-label', 'title', 'alt', 'placeholder']);
const LETTER = /\p{L}/u;

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow literal user-facing text in components (ADR-0012, MOD-Copy).' },
    schema: [
      {
        type: 'object',
        properties: { allow: { type: 'array', items: { type: 'string' } } },
        additionalProperties: false,
      },
    ],
    messages: {
      text: 'Literal text "{{text}}" in a component: take it from MOD-Copy (t/tBoth) so it has both languages (ADR-0012).',
      attr: 'Literal {{name}} "{{text}}": use localizedAttrs with a COPY string (ADR-0012).',
    },
  },
  create(context) {
    const allow = new Set((context.options[0] && context.options[0].allow) || []);
    const flagged = (text) => {
      const t = text.trim();
      return t !== '' && LETTER.test(t) && !allow.has(t);
    };
    return {
      JSXText(node) {
        if (flagged(node.value)) context.report({ node, messageId: 'text', data: { text: node.value.trim() } });
      },
      JSXAttribute(node) {
        const name = typeof node.name.name === 'string' ? node.name.name : '';
        const v = node.value;
        if (!TEXT_ATTRS.has(name) || !v) return;
        const text =
          v.type === 'Literal' && typeof v.value === 'string'
            ? v.value
            : v.type === 'JSXExpressionContainer' &&
                v.expression.type === 'Literal' &&
                typeof v.expression.value === 'string'
              ? v.expression.value
              : v.type === 'JSXExpressionContainer' &&
                  v.expression.type === 'TemplateLiteral' &&
                  v.expression.expressions.length === 0
                ? v.expression.quasis[0].value.cooked
                : null;
        if (text !== null && flagged(text)) context.report({ node, messageId: 'attr', data: { name, text } });
      },
    };
  },
};

export default { rules: { 'no-literal-text': rule } };
