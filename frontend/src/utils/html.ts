/**
 * Simple HTML entity escaping to prevent XSS in dynamically-rendered content.
 * Only needed for values that come from external sources (cv.json, attributes).
 */
export function escHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
