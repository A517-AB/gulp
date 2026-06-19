/// <reference lib="dom" />
import { detach } from './dom.ts';

export interface SanitizeAttrsRule {
  attribute: string;
  selector: string;
}

export interface SanitizeRules {
  tags: string[];
  attributes: SanitizeAttrsRule[];
}

const DEFAULT_REMOVE_TAGS: string[] = [
  'script',
  'style',
  'iframe[src]',
  'link[href*="javascript:"]',
  'object[type="text/x-scriptlet"]',
  'object[data^="data:text/html;base64"]',
  'img[src^="data:text/html;base64"]',
  '[src^="javascript:"]',
  '[dynsrc^="javascript:"]',
  '[lowsrc^="javascript:"]',
  '[type^="application/x-shockwave-flash"]',
];

const DEFAULT_REMOVE_ATTRS: SanitizeAttrsRule[] = [
  { attribute: 'href', selector: '[href*="javascript:"]' },
  { attribute: 'href', selector: 'a[href^="data:text/html;base64"]' },
  { attribute: 'background', selector: '[background^="javascript:"]' },
  { attribute: 'style', selector: '[style*="javascript:"]' },
  { attribute: 'style', selector: '[style*="expression("]' },
];

const JS_EVENTS: string[] = [
  'onchange', 'onclick', 'onmouseover', 'onmouseout', 'onkeydown', 'onload',
  'onerror', 'onblur', 'onfocus', 'onbeforeload', 'onbeforeunload', 'onkeyup',
  'onsubmit', 'onafterprint', 'onbeforeonload', 'onbeforeprint', 'oncanplay',
  'oncanplaythrough', 'oncontextmenu', 'ondblclick', 'ondrag', 'ondragend',
  'ondragenter', 'ondragleave', 'ondragover', 'ondragstart', 'ondrop',
  'ondurationchange', 'onemptied', 'onended', 'oninput', 'oninvalid',
  'onkeypress', 'onloadeddata', 'onloadedmetadata', 'onloadstart', 'onmessage',
  'onmousedown', 'onmousemove', 'onmouseup', 'onmousewheel', 'onoffline',
  'ononline', 'onpagehide', 'onpageshow', 'onpause', 'onplay', 'onplaying',
  'onpopstate', 'onprogress', 'onratechange', 'onreadystatechange', 'onresize',
  'onscroll', 'onseeked', 'onseeking', 'onselect', 'onstalled', 'onstorage',
  'onsuspend', 'ontimeupdate', 'onunload', 'onvolumechange', 'onwaiting',
  'onmouseenter', 'onmouseleave', 'onpointerout', 'onpointermove',
  'onpointerleave', 'onpointerenter', 'onpointerover', 'oncopy', 'ontoggle',
  'onbeforecopy', 'onbeforecut', 'onbeforeinput',
];

function removeXssTags(wrapper: HTMLElement, tags: string[]): void {
  wrapper.querySelectorAll(tags.join(',')).forEach(el => detach(el));
}

function removeJsEvents(wrapper: HTMLElement): void {
  const selector = JS_EVENTS.map(e => `[${e}]`).join(',');
  wrapper.querySelectorAll(selector).forEach(el => {
    JS_EVENTS.forEach(attr => {
      if (el.hasAttribute(attr)) el.removeAttribute(attr);
    });
  });
}

function removeXssAttrs(wrapper: HTMLElement, rules: SanitizeAttrsRule[]): void {
  for (const rule of rules) {
    wrapper.querySelectorAll(rule.selector).forEach(el => {
      if (rule.selector === 'a[href]') {
        const val = el.getAttribute(rule.attribute) ?? '';
        if (val.replace(/\t|\s|&/g, '').includes('javascript:alert')) {
          el.removeAttribute(rule.attribute);
        }
      } else {
        el.removeAttribute(rule.attribute);
      }
    });
  }
}

export function sanitize(html: string, rules?: Partial<SanitizeRules>): string {
  if (!html) return html;

  const tags = rules?.tags ?? DEFAULT_REMOVE_TAGS;
  const attrs = rules?.attributes ?? DEFAULT_REMOVE_ATTRS;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;

  removeXssTags(wrapper, tags);
  removeJsEvents(wrapper);
  removeXssAttrs(wrapper, attrs);

  return wrapper.innerHTML.replace(/&amp;/g, '&');
}

export { DEFAULT_REMOVE_TAGS, DEFAULT_REMOVE_ATTRS };
