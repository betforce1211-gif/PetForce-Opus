/**
 * Input sanitization utilities for user-facing text fields.
 *
 * Prevents stored XSS by escaping HTML entities in text inputs.
 * Applied at the API boundary — all user-provided strings are sanitized
 * before they reach the database.
 */

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

const HTML_ENTITY_RE = /[&<>"']/g;

/**
 * Escape HTML entities in a string to prevent XSS when rendered.
 * Returns the input unchanged if it contains no special characters.
 */
export function escapeHtml(input: string): string {
  return input.replace(HTML_ENTITY_RE, (char) => HTML_ENTITIES[char]!);
}

/**
 * Sanitize a text string: trim whitespace, escape HTML entities,
 * and normalize internal whitespace (collapse runs of spaces/tabs).
 */
export function sanitizeText(input: string): string {
  return escapeHtml(input.trim()).replace(/\s+/g, " ");
}

/**
 * Sanitize a multi-line text field (notes, descriptions).
 * Preserves intentional line breaks but escapes HTML and trims.
 */
export function sanitizeMultilineText(input: string): string {
  return input
    .split("\n")
    .map((line) => escapeHtml(line.trimEnd()))
    .join("\n")
    .trim();
}
