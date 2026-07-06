/**
 * Local ESLint plugin enforcing OnTour's semantic design tokens.
 */

const forbiddenPatterns = [
  {
    name: "black/white",
    regex:
      /\b(?:bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|shadow|divide|placeholder|accent|selection|caret)-(?:black|white)\b/g,
    message:
      'Use semantic tokens instead of black/white (e.g. bg-background, text-foreground).',
  },
  {
    name: "raw color",
    regex:
      /\b(?:bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|shadow|divide|placeholder|accent|selection|caret)-(?:green|yellow|red|blue)(?:-[0-9]+)?\b/g,
    message:
      'Use semantic tokens instead of raw green/yellow/red/blue colors (e.g. bg-success, text-warning, text-danger).',
  },
];

const classNameHelpers = new Set(["cn", "clsx", "cva", "twMerge"]);


function getClassNameAttrName(node) {
  if (!node || node.type !== "JSXAttribute") return null;
  if (node.name.type === "JSXIdentifier") return node.name.name;
  if (node.name.type === "JSXNamespacedName") return `${node.name.namespace.name}:${node.name.name.name}`;
  return null;
}

function reportMatches(context, node, matches) {
  if (matches.length === 0) return;
  const unique = [...new Set(matches)];
  const isBlackWhite = unique.some((m) => /-(?:black|white)\b/.test(m));
  const isRawColor = unique.some((m) => /-(?:green|yellow|red|blue)(?:-[0-9]+)?\b/.test(m));
  const messageParts = [];
  if (isBlackWhite) {
    messageParts.push("black/white (e.g. bg-background, text-foreground)");
  }
  if (isRawColor) {
    messageParts.push("raw green/yellow/red/blue (e.g. bg-success, text-warning, text-danger)");
  }
  context.report({
    node,
    message: `Use semantic tokens instead of ${messageParts.join(" and ")}: ${unique.join(", ")}`,
  });
}

function scanText(context, node, text) {
  if (typeof text !== "string") return;
  const matches = [];
  for (const { regex } of forbiddenPatterns) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push(match[0]);
    }
  }
  reportMatches(context, node, matches);
}

function checkNode(context, node) {
  if (!node) return;

  if (node.type === "Literal" && typeof node.value === "string") {
    scanText(context, node, node.value);
    return;
  }

  if (node.type === "TemplateLiteral") {
    for (const quasi of node.quasis) {
      scanText(context, node, quasi.value.raw);
    }
    return;
  }

  if (node.type === "JSXExpressionContainer") {
    checkNode(context, node.expression);
    return;
  }

  if (node.type === "CallExpression") {
    for (const arg of node.arguments) {
      checkNode(context, arg);
    }
    return;
  }

  if (node.type === "ConditionalExpression") {
    checkNode(context, node.consequent);
    checkNode(context, node.alternate);
    return;
  }

  if (node.type === "LogicalExpression" || node.type === "BinaryExpression") {
    checkNode(context, node.left);
    checkNode(context, node.right);
    return;
  }

  if (node.type === "ArrayExpression") {
    for (const element of node.elements) {
      if (element) checkNode(context, element);
    }
    return;
  }
}

const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow raw Tailwind colors in favor of semantic tokens",
      recommended: true,
    },
    schema: [],
    messages: {},
  },
  create(context) {
    return {
      JSXAttribute(node) {
        const attrName = getClassNameAttrName(node);
        if (attrName !== "className" && attrName !== "class") return;
        checkNode(context, node.value);
      },
      CallExpression(node) {
        const callee = node.callee;
        const name =
          callee.type === "Identifier"
            ? callee.name
            : callee.type === "MemberExpression" && callee.property.type === "Identifier"
            ? callee.property.name
            : null;
        if (!name || !classNameHelpers.has(name)) return;
        checkNode(context, node);
      },
    };
  },
};

export default {
  meta: {
    name: "ontour-local",
    version: "0.0.1",
  },
  rules: {
    "no-raw-tailwind-colors": rule,
  },
};
