/**
 * Comprehensive HTML Entity Decoder
 * Converts HTML entities (e.g. &amp;, &#038;, &quot;, &#8217;, &nbsp;) into clean readable characters.
 * Handles single and double-encoded WordPress strings.
 */
export function decodeHtmlEntities(input?: string | null): string {
  if (!input || typeof input !== 'string') return '';

  let str = input;
  // Multiple passes in case WordPress returned double-encoded entities like &amp;amp; or &amp;#038;
  for (let i = 0; i < 3; i++) {
    if (!str.includes('&')) break;
    const prev = str;
    str = str
      .replace(/&amp;/gi, '&')
      .replace(/&#038;/gi, '&')
      .replace(/&#38;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#039;/gi, "'")
      .replace(/&#8217;/gi, "'")
      .replace(/&#8216;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&#8211;/gi, '–')
      .replace(/&#8212;/gi, '—')
      .replace(/&pound;/gi, '£')
      .replace(/&#163;/gi, '£')
      .replace(/&euro;/gi, '€')
      .replace(/&#8364;/gi, '€')
      .replace(/&copy;/gi, '©')
      .replace(/&reg;/gi, '®')
      .replace(/&trade;/gi, '™')
      .replace(/&deg;/gi, '°')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&#160;/gi, ' ')
      .replace(/&bull;/gi, '•')
      .replace(/&hellip;/gi, '…')
      .replace(/&ndash;/gi, '–')
      .replace(/&mdash;/gi, '—')
      .replace(/&lsquo;/gi, "'")
      .replace(/&rsquo;/gi, "'")
      .replace(/&ldquo;/gi, '"')
      .replace(/&rdquo;/gi, '"')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>');
    if (str === prev) break;
  }
  return str;
}
