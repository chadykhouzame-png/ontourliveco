/**
 * Local ESLint plugin enforcing OnTour's semantic design tokens.
 */

const COLOR_UTILITY_PREFIX =
  "(?:bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|shadow|divide|placeholder|accent|selection|caret)";

const forbiddenPatterns = [
  {
    name: "black/white",
    regex: new RegExp(`\\b${COLOR_UTILITY_PREFIX}-(?:black|white)\\b`, "g"),
  },
  {
    name: "raw color",
    regex: new RegExp(
      `\\b${COLOR_UTILITY_PREFIX}-(?:green|yellow|red|blue|emerald|lime|amber|orange|rose|sky|indigo)(?:-[0-9]+)?\\b`,
      "g"
    ),
  },
  {
    // Arbitrary hex values on color utilities: bg-[#22c55e], text-[#ef4444], etc.
    name: "arbitrary hex",
    regex: new RegExp(`\\b${COLOR_UTILITY_PREFIX}-\\[#[0-9a-fA-F]{3,8}\\]`, "g"),
  },
];

/**
 * Official brand hex values allowed in arbitrary color utilities
 * (e.g. `bg-[#1DB954]` for the Spotify connect button). These are the
 * only exception to the "no arbitrary hex" rule — anything else must
 * be a semantic token defined in src/index.css.
 *
 * Keep entries as lowercase 6-digit hex. `normalizeHex` handles 3-digit
 * shorthand and 8-digit (with alpha) forms at match time.
 */
const BRAND_HEX_ALLOWLIST = new Set([
  // Spotify
  "1db954",
  "1ed760",
  // Instagram (solid + gradient stops)
  "e4405f",
  "f58529",
  "dd2a7b",
  "8134af",
  "515bd4",
  // SoundCloud
  "ff5500",
  "ff7700",
]);

function normalizeHex(hex) {
  let h = hex.toLowerCase();
  if (h.length === 3) {
    h = h.split("").map((c) => c + c).join("");
  } else if (h.length === 4) {
    h = h.split("").map((c) => c + c).join("").slice(0, 6);
  } else if (h.length === 8) {
    // Drop alpha channel when comparing brand identity.
    h = h.slice(0, 6);
  }
  return h;
}

function isAllowedBrandHex(match) {
  const hex = match.match(/#([0-9a-fA-F]{3,8})\]$/)?.[1];
  if (!hex) return false;
  return BRAND_HEX_ALLOWLIST.has(normalizeHex(hex));
}

const classNameHelpers = new Set(["cn", "clsx", "cva", "twMerge"]);

const reported = new WeakSet();

function getClassNameAttrName(node) {
  if (!node || node.type !== "JSXAttribute") return null;
  if (node.name.type === "JSXIdentifier") return node.name.name;
  if (node.name.type === "JSXNamespacedName") return `${node.name.namespace.name}:${node.name.name.name}`;
  return null;
}

function reportMatches(context, node, matches) {
  if (matches.length === 0) return;
  if (reported.has(node)) return;
  reported.add(node);
  const unique = [...new Set(matches)];
  const isBlackWhite = unique.some((m) => /-(?:black|white)\b/.test(m));
  const isRawColor = unique.some((m) =>
    /-(?:green|yellow|red|blue|emerald|lime|amber|orange|rose|sky|indigo)(?:-[0-9]+)?\b/.test(m)
  );
  const isArbitraryHex = unique.some((m) => /-\[#[0-9a-fA-F]{3,8}\]$/.test(m));
  const messageParts = [];
  if (isBlackWhite) {
    messageParts.push("black/white (use bg-background, text-foreground)");
  }
  if (isRawColor) {
    messageParts.push(
      "raw status colors (use bg-success, text-warning, text-danger, text-info)"
    );
  }
  if (isArbitraryHex) {
    messageParts.push(
      "arbitrary hex colors (use semantic tokens defined in src/index.css)"
    );
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
      const hit = match[0];
      // Allow official brand hex values (Spotify/Instagram/SoundCloud)
      // while keeping every other arbitrary hex forbidden.
      if (/-\[#[0-9a-fA-F]{3,8}\]$/.test(hit) && isAllowedBrandHex(hit)) {
        continue;
      }
      matches.push(hit);
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
