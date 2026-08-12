/**
 * html.js — Texto. Component Library
 * Lightweight DOM element factory with unified API.
 *
 * Usage:
 *   import { div, button, header } from './html.js';
 *
 *   const btn = button(
 *     { className: ['btn', 'btn--primary'], onClick: () => console.log('clicked') },
 *     container,
 *     'Send'
 *   );
 *
 * Attribute rules:
 *   - className       → string or string[] joined with spaces
 *   - style           → object ({ color: 'red', fontSize: '14px' })
 *   - on<Event>       → function, registered via addEventListener
 *   - data-*, aria-*  → set via setAttribute (preserves hyphenated names)
 *   - htmlFor         → maps to the 'for' attribute on <label>
 *   - everything else → assigned as DOM property
 *
 * children can be:
 *   - a string or number     → TextNode
 *   - a DOM Node             → appended directly
 *   - an array of the above  → each appended in order
 *   - null / undefined       → ignored
 */

// ─── Core ────────────────────────────────────────────────────────────────────

export const tag = (type, attributes = {}, parent = null, children = null) => {
    const e = document.createElement(type);

    // 1. Apply attributes first
    for (const k in attributes) {
        const v = attributes[k];

        if (k === 'className') {
            e.className = Array.isArray(v) ? v.join(' ') : v;

        } else if (k === 'style' && v !== null && typeof v === 'object') {
            Object.assign(e.style, v);

        } else if (k.startsWith('on') && typeof v === 'function') {
            e.addEventListener(k.substring(2).toLowerCase(), v);

        } else if (k === 'htmlFor') {
            e.setAttribute('for', v);

        } else if (k.startsWith('data-') || k.startsWith('aria-')) {
            e.setAttribute(k, v);

        } else {
            e[k] = v;
        }
    }

    // 2. Append children
    if (children !== null && children !== undefined) {
        const nodes = Array.isArray(children) ? children : [children];
        nodes.forEach(child => {
            if (child === null || child === undefined) return;
            if (typeof child === 'string' || typeof child === 'number') {
                e.appendChild(document.createTextNode(String(child)));
            } else if (child instanceof Node) {
                e.appendChild(child);
            }
        });
    }

    // 3. Mount to parent last (avoids partial renders in the live DOM)
    if (parent) parent.appendChild(e);

    return e;
};

// ─── Document Structure ───────────────────────────────────────────────────────

export const header  = (attrs = {}, parent = null, children = null) => tag('header',  attrs, parent, children);
export const footer  = (attrs = {}, parent = null, children = null) => tag('footer',  attrs, parent, children);
export const main    = (attrs = {}, parent = null, children = null) => tag('main',    attrs, parent, children);
export const nav     = (attrs = {}, parent = null, children = null) => tag('nav',     attrs, parent, children);
export const section = (attrs = {}, parent = null, children = null) => tag('section', attrs, parent, children);
export const article = (attrs = {}, parent = null, children = null) => tag('article', attrs, parent, children);
export const aside   = (attrs = {}, parent = null, children = null) => tag('aside',   attrs, parent, children);
export const div     = (attrs = {}, parent = null, children = null) => tag('div',     attrs, parent, children);

// ─── Headings ─────────────────────────────────────────────────────────────────

export const h1 = (attrs = {}, parent = null, children = null) => tag('h1', attrs, parent, children);
export const h2 = (attrs = {}, parent = null, children = null) => tag('h2', attrs, parent, children);
export const h3 = (attrs = {}, parent = null, children = null) => tag('h3', attrs, parent, children);
export const h4 = (attrs = {}, parent = null, children = null) => tag('h4', attrs, parent, children);
export const h5 = (attrs = {}, parent = null, children = null) => tag('h5', attrs, parent, children);
export const h6 = (attrs = {}, parent = null, children = null) => tag('h6', attrs, parent, children);

// ─── Text & Inline ────────────────────────────────────────────────────────────

export const p      = (attrs = {}, parent = null, children = null) => tag('p',      attrs, parent, children);
export const span   = (attrs = {}, parent = null, children = null) => tag('span',   attrs, parent, children);
export const strong = (attrs = {}, parent = null, children = null) => tag('strong', attrs, parent, children);
export const em     = (attrs = {}, parent = null, children = null) => tag('em',     attrs, parent, children);
export const small  = (attrs = {}, parent = null, children = null) => tag('small',  attrs, parent, children);
export const code   = (attrs = {}, parent = null, children = null) => tag('code',   attrs, parent, children);
export const pre    = (attrs = {}, parent = null, children = null) => tag('pre',    attrs, parent, children);
export const time   = (attrs = {}, parent = null, children = null) => tag('time',   attrs, parent, children);
export const hr     = (attrs = {}, parent = null)                  => tag('hr',     attrs, parent);
export const br     = (attrs = {}, parent = null)                  => tag('br',     attrs, parent);

// ─── Links & Navigation ──────────────────────────────────────────────────────

export const a = (attrs = {}, parent = null, children = null) => tag('a', attrs, parent, children);

// ─── Lists ────────────────────────────────────────────────────────────────────

export const ul = (attrs = {}, parent = null, children = null) => tag('ul', attrs, parent, children);
export const ol = (attrs = {}, parent = null, children = null) => tag('ol', attrs, parent, children);
export const li = (attrs = {}, parent = null, children = null) => tag('li', attrs, parent, children);

// ─── Forms ────────────────────────────────────────────────────────────────────

export const form     = (attrs = {}, parent = null, children = null) => tag('form',     attrs, parent, children);
export const label    = (attrs = {}, parent = null, children = null) => tag('label',    attrs, parent, children);
export const input    = (attrs = {}, parent = null, children = null) => tag('input',    attrs, parent, children);
export const textarea = (attrs = {}, parent = null, children = null) => tag('textarea', attrs, parent, children);
export const button   = (attrs = {}, parent = null, children = null) => tag('button',   attrs, parent, children);
export const select   = (attrs = {}, parent = null, children = null) => tag('select',   attrs, parent, children);
export const option   = (attrs = {}, parent = null, children = null) => tag('option',   attrs, parent, children);
export const fieldset = (attrs = {}, parent = null, children = null) => tag('fieldset', attrs, parent, children);
export const legend   = (attrs = {}, parent = null, children = null) => tag('legend',   attrs, parent, children);

// ─── Media ───────────────────────────────────────────────────────────────────

export const img        = (attrs = {}, parent = null)                  => tag('img',     attrs, parent);
export const figure     = (attrs = {}, parent = null, children = null) => tag('figure',     attrs, parent, children);
export const figcaption = (attrs = {}, parent = null, children = null) => tag('figcaption', attrs, parent, children);
export const audio      = (attrs = {}, parent = null, children = null) => tag('audio',      attrs, parent, children);
export const video      = (attrs = {}, parent = null, children = null) => tag('video',      attrs, parent, children);
export const source     = (attrs = {}, parent = null)                  => tag('source',     attrs, parent);

// ─── Progress & Status ───────────────────────────────────────────────────────

export const progress = (attrs = {}, parent = null, children = null) => tag('progress', attrs, parent, children);

// ─── Dialogs & Interactive ────────────────────────────────────────────────────

export const dialog  = (attrs = {}, parent = null, children = null) => tag('dialog',  attrs, parent, children);
export const details = (attrs = {}, parent = null, children = null) => tag('details', attrs, parent, children);
export const summary = (attrs = {}, parent = null, children = null) => tag('summary', attrs, parent, children);

// ─── Tables ───────────────────────────────────────────────────────────────────

export const table = (attrs = {}, parent = null, children = null) => tag('table', attrs, parent, children);
export const thead = (attrs = {}, parent = null, children = null) => tag('thead', attrs, parent, children);
export const tbody = (attrs = {}, parent = null, children = null) => tag('tbody', attrs, parent, children);
export const tfoot = (attrs = {}, parent = null, children = null) => tag('tfoot', attrs, parent, children);
export const tr    = (attrs = {}, parent = null, children = null) => tag('tr',    attrs, parent, children);
export const th    = (attrs = {}, parent = null, children = null) => tag('th',    attrs, parent, children);
export const td    = (attrs = {}, parent = null, children = null) => tag('td',    attrs, parent, children);
