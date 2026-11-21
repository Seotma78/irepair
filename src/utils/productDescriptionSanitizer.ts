/**
 * Utility for sanitizing and formatting WooCommerce product short descriptions
 * and generating plain-text snippets for cards, search results, and metadata.
 */

import DOMPurify from 'dompurify';
import { decodeHtmlEntities } from './decodeHtml';

/**
 * Checks whether an HTML string is empty, null, or contains only whitespace/empty tags.
 * e.g. "", "<p></p>", "<p>&nbsp;</p>", "<br>", "   "
 */
export function isEmptyHtml(html?: string | null): boolean {
  if (!html) return true;
  // Strip tags and common whitespace entities
  const stripped = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .trim();
  return stripped.length === 0;
}

/**
 * Implements WordPress wpautop logic: converts plain-text line breaks into <p> and <br /> tags
 * while preserving existing HTML blocks and tags (lists, tables, headings, paragraphs).
 */
export function wpautop(raw: string): string {
  if (!raw) return '';

  let text = raw.trim();

  // If text already has block tags (ul, ol, table, p, h1-h6) and no bare newlines outside tags, return
  const hasBlockTags = /<(?:p|div|ul|ol|li|table|blockquote|h[1-6]|pre)[^>]*>/i.test(text);

  // Normalize line endings
  text = text.replace(/\r\n|\r/g, '\n');

  // If the text looks like an unformatted bullet list (e.g. lines starting with "-" or "•" or "Display: ...\nProcessor: ..."),
  // convert lines into a proper <ul><li> list if no <ul> is present.
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const isLineBreakList = !hasBlockTags && lines.length > 1;

  if (isLineBreakList) {
    const listItems = lines.map((line) => {
      const cleanLine = line.replace(/^[•\-\*]\s*/, '');
      return `<li>${cleanLine}</li>`;
    });
    return `<ul>\n${listItems.join('\n')}\n</ul>`;
  }

  if (hasBlockTags) {
    // Preserve block tags but ensure bare double-line breaks inside text blocks are handled
    return text;
  }

  // Handle standard paragraphs: double newlines become paragraphs
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return '';

  return paragraphs
    .map((p) => {
      // Single newlines become <br />
      const withBr = p.replace(/\n/g, '<br />\n');
      return `<p>${withBr}</p>`;
    })
    .join('\n\n');
}

/**
 * Client and server-compatible HTML sanitizer for WooCommerce product short descriptions.
 * Allows safe tags, attributes, and inline text styling while stripping scripts, iframes,
 * event handlers, and unsafe styles. External links are given rel="noopener noreferrer" and target="_blank".
 */
export function sanitizeProductShortDescriptionHtml(rawHtml?: string | null): string {
  if (!rawHtml || isEmptyHtml(rawHtml)) return '';

  // First apply wpautop to ensure WordPress-style line breaks and paragraphs are preserved
  const autoParagraphHtml = wpautop(rawHtml);

  // Browser environment: use DOMPurify with strict whitelist
  if (typeof window !== 'undefined') {
    // Configure DOMPurify hook to add target="_blank" and rel="noopener noreferrer" on external links
    DOMPurify.removeHook('afterSanitizeAttributes');
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A') {
        const href = node.getAttribute('href') || '';
        if (href.startsWith('http://') || href.startsWith('https://')) {
          const isInternal =
            href.includes('irepair-mobiles.co.uk') ||
            href.startsWith(window.location.origin);
          if (!isInternal) {
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener noreferrer');
          }
        }
      }
    });

    const sanitized = DOMPurify.sanitize(autoParagraphHtml, {
      ALLOWED_TAGS: [
        'strong',
        'b',
        'em',
        'i',
        'u',
        's',
        'strike',
        'del',
        'p',
        'br',
        'ul',
        'ol',
        'li',
        'a',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'blockquote',
        'span',
        'sub',
        'sup',
        'hr',
        'table',
        'thead',
        'tbody',
        'tfoot',
        'tr',
        'th',
        'td',
        'img',
      ],
      ALLOWED_ATTR: [
        'href',
        'title',
        'target',
        'rel',
        'class',
        'style',
        'src',
        'alt',
        'width',
        'height',
        'loading',
        'colspan',
        'rowspan',
        'scope',
        'align',
        'dir',
        'lang',
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });

    return sanitized;
  }

  // Server-side fallback sanitizer (Node.js runtime / SSR)
  let clean = autoParagraphHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '') // Strip on* event handlers
    .replace(/href\s*=\s*["']?javascript:[^"'>]+/gi, 'href="#"');

  // Enforce target="_blank" and rel="noopener noreferrer" on external links
  clean = clean.replace(/<a\b([^>]*)>/gi, (match, attrs) => {
    const isHttp = /href=["']https?:\/\//i.test(attrs);
    const isInternal = /href=["']https?:\/\/(?:[a-z0-9-]+\.)?irepair-mobiles\.co\.uk/i.test(attrs);
    
    if (isHttp && !isInternal) {
      let updated = attrs;
      if (!/target=["']_blank["']/i.test(updated)) {
        updated += ' target="_blank"';
      }
      if (!/rel=["'][^"']*noopener[^"']*["']/i.test(updated)) {
        updated += ' rel="noopener noreferrer"';
      }
      return `<a${updated}>`;
    }
    return match;
  });

  return clean;
}

/**
 * Extracts a clean, plain-text snippet for product cards, search results, carousels, and meta previews.
 * Strips all HTML tags, decodes entities, collapses all whitespace/newlines, and trims to maxLength.
 */
export function getPlainTextSnippet(raw?: string | null, maxLength: number = 140): string {
  if (!raw) return '';

  // 1. Strip all HTML tags
  const noTags = raw.replace(/<[^>]*>/g, ' ');

  // 2. Decode entities (&amp;, &pound;, &#8243;, quotes, etc.)
  const decoded = decodeHtmlEntities(noTags);

  // 3. Collapse multiple spaces and newlines into a single space
  const collapsed = decoded.replace(/\s+/g, ' ').trim();

  if (collapsed.length <= maxLength) {
    return collapsed;
  }

  // Truncate at word boundary if possible
  const truncated = collapsed.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  const cleanSnippet = lastSpace > maxLength * 0.75 ? truncated.slice(0, lastSpace) : truncated;

  return `${cleanSnippet.trim()}...`;
}
