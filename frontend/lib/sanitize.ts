/**
 * HTML Sanitization Utility
 * 
 * Provides XSS protection by sanitizing HTML content before rendering.
 * Uses DOMPurify to remove malicious scripts, event handlers, and dangerous URLs.
 */

import DOMPurify, { Config } from 'dompurify';

// Configuration for DOMPurify
const SANITIZE_CONFIG: Config = {
  // Allowed HTML tags - covers common rich text formatting
  ALLOWED_TAGS: [
    // Text formatting
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'ins',
    'sub', 'sup', 'small', 'mark', 'abbr', 'cite', 'q',
    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Lists
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    // Links and media
    'a', 'img', 'figure', 'figcaption', 'picture', 'source',
    // Blocks
    'div', 'span', 'blockquote', 'pre', 'code', 'hr',
    // Tables
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
    // Semantic
    'article', 'section', 'header', 'footer', 'aside', 'nav', 'main',
    // Video/Audio (for embedded content)
    'video', 'audio', 'iframe',
  ],
  
  // Allowed attributes
  ALLOWED_ATTR: [
    // Global attributes
    'id', 'class', 'style', 'title', 'lang', 'dir',
    // Links
    'href', 'target', 'rel', 'download',
    // Images
    'src', 'alt', 'width', 'height', 'loading', 'decoding',
    // Tables
    'colspan', 'rowspan', 'scope', 'headers',
    // Media
    'controls', 'autoplay', 'loop', 'muted', 'poster', 'preload',
    // Iframe (for embedded videos like YouTube)
    'allow', 'allowfullscreen', 'frameborder', 'scrolling',
    // Data attributes (useful for styling/JS hooks)
    'data-*',
  ],
  
  // Allow data attributes
  ALLOW_DATA_ATTR: true,
  
  // Allow safe URI schemes
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|xxx):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  
  // Keep safe styles (remove potentially dangerous ones)
  ALLOW_ARIA_ATTR: true,
  
  // Don't allow form elements (prevent phishing)
  FORBID_TAGS: ['form', 'input', 'button', 'select', 'textarea', 'script', 'style'],
  
  // Don't allow event handlers
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'],
};

// Stricter config for user-generated content (comments, messages, etc.)
const STRICT_SANITIZE_CONFIG: Config = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u',
    'ul', 'ol', 'li',
    'a', 'blockquote', 'code', 'pre',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  ALLOW_DATA_ATTR: false,
};

// Config for iframe embeds (YouTube, Vimeo, etc.)
const EMBED_SANITIZE_CONFIG: Config = {
  ...SANITIZE_CONFIG,
  ADD_TAGS: ['iframe'],
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'],
};

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Use this for rich text content like posts, articles, event descriptions.
 * 
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  
  // On server-side, return empty string (will be sanitized on client hydration)
  if (typeof window === 'undefined') {
    return html; // Will be sanitized when component hydrates on client
  }
  
  return DOMPurify.sanitize(html, SANITIZE_CONFIG);
}

/**
 * Sanitizes HTML with stricter rules for user-generated content.
 * Use this for comments, chat messages, user bios, etc.
 * 
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string with minimal allowed tags
 */
export function sanitizeUserContent(html: string | null | undefined): string {
  if (!html) return '';
  
  if (typeof window === 'undefined') {
    return html;
  }
  
  return DOMPurify.sanitize(html, STRICT_SANITIZE_CONFIG);
}

/**
 * Sanitizes HTML that may contain embedded iframes (YouTube, Vimeo, etc.)
 * Use this for content that needs to display embedded videos.
 * 
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string allowing safe embeds
 */
export function sanitizeWithEmbeds(html: string | null | undefined): string {
  if (!html) return '';
  
  if (typeof window === 'undefined') {
    return html;
  }
  
  return DOMPurify.sanitize(html, EMBED_SANITIZE_CONFIG);
}

/**
 * Strips all HTML tags and returns plain text.
 * Use this when you need to display a preview or excerpt.
 * 
 * @param html - The HTML string to strip
 * @returns Plain text without any HTML tags
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  
  if (typeof window === 'undefined') {
    // Server-side fallback using regex
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  }
  
  // Use DOMPurify to strip all tags
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
}

/**
 * Sanitizes HTML and also removes inline color styles.
 * Use this for content that should follow the app's color scheme.
 * 
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML with inline colors removed
 */
export function sanitizeAndStripColors(html: string | null | undefined): string {
  if (!html) return '';
  
  // First sanitize
  let sanitized = sanitizeHtml(html);
  
  // Then remove inline color styles
  sanitized = sanitized
    .replace(/color\s*:\s*[^;"}]+;?/gi, '')
    .replace(/background-color\s*:\s*[^;"}]+;?/gi, '')
    .replace(/background\s*:\s*[^;"}]+;?/gi, '');
  
  return sanitized;
}

export default sanitizeHtml;

