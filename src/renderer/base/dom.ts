/// <reference lib="dom" />

export type StyleMap  = Partial<CSSStyleDeclaration>;
export type AttrMap   = Record<string, string>;
export type AnyElement = Element | HTMLElement | SVGElement;

export interface ElementProperties {
  id?:        string;
  className?: string;
  innerHTML?: string;
  styles?:    string;
  attrs?:     AttrMap;
}

const SVG_TAGS = /^svg|^path|^g/;

export function createElement<T extends Element = HTMLElement>(
  tagName: string,
  properties?: ElementProperties,
): T {
  const element = SVG_TAGS.test(tagName)
    ? document.createElementNS('http://www.w3.org/2000/svg', tagName)
    : document.createElement(tagName);

  if (!properties) return element as unknown as T;

  if (properties.innerHTML !== undefined) element.innerHTML = properties.innerHTML;
  if (properties.className !== undefined) element.setAttribute('class', properties.className);
  if (properties.id        !== undefined) (element as HTMLElement).id = properties.id;
  if (properties.styles    !== undefined) (element as HTMLElement).style.cssText = properties.styles;
  if (properties.attrs     !== undefined) setAttributes(element, properties.attrs);

  return element as unknown as T;
}

export function setAttributes(element: Element, attrs: AttrMap): Element {
  for (const key of Object.keys(attrs)) {
    element.setAttribute(key, attrs[key] ?? '');
  }
  return element;
}

export function setStyleAttribute(element: HTMLElement, attrs: StyleMap): void {
  for (const key of Object.keys(attrs) as (keyof CSSStyleDeclaration)[]) {
    const value = attrs[key];
    if (typeof value === 'string') {
      (element.style as unknown as Record<string, string>)[key as string] = value;
    }
  }
}

export function updateCSSText(element: HTMLElement, cssText: string): void {
  const parse = (text: string): Record<string, string> =>
    text.split(';').reduce<Record<string, string>>((acc, rule) => {
      const idx = rule.indexOf(':');
      if (idx === -1) return acc;
      const key   = rule.slice(0, idx).trim();
      const value = rule.slice(idx + 1).trim();
      if (key && value) acc[key] = value;
      return acc;
    }, {});

  const merged = { ...parse(element.style.cssText), ...parse(cssText) };
  const tmp = document.createElement('div');
  for (const [key, value] of Object.entries(merged)) {
    tmp.style.setProperty(key, value);
  }
  element.style.cssText = tmp.style.cssText;
}

export function addClass(elements: Element[] | NodeList, classes: string | string[]): void {
  const list = Array.isArray(classes) ? classes : [classes];
  for (const el of Array.from(elements) as Element[]) {
    for (const cls of list) {
      if (!el.classList.contains(cls)) el.classList.add(cls);
    }
  }
}

export function removeClass(elements: Element[] | NodeList, classes: string | string[]): void {
  const list = Array.isArray(classes) ? classes : [classes];
  for (const el of Array.from(elements) as Element[]) {
    for (const cls of list) {
      el.classList.remove(cls);
    }
  }
}

export function toggleClasses(element: Element, add: string[], remove: string[]): void {
  addClass([element], add);
  removeClass([element], remove);
}

export function isVisible(element: HTMLElement): boolean {
  return element.style.visibility === '' && element.offsetWidth > 0;
}

export function prepend(elements: Element[], target: Element): void {
  const frag = document.createDocumentFragment();
  for (const el of elements) frag.appendChild(el);
  target.insertBefore(frag, target.firstElementChild);
}

export function append(elements: Element[] | NodeList, target: Element): void {
  const frag = document.createDocumentFragment();
  for (const el of Array.from(elements)) frag.appendChild(el);
  target.appendChild(frag);
}

/** Removes from DOM, keeps listeners. Returns element for re-insertion. */
export function detach<T extends Node>(element: T): T | null {
  return element.parentNode?.removeChild(element) ?? null;
}

/** Removes from DOM permanently. */
export function remove(element: Node): void {
  element.parentNode?.removeChild(element);
}

export function siblings(element: Element): Element[] {
  if (!element.parentNode) return [];
  return Array.from(element.parentNode.childNodes)
    .filter((node): node is Element => node.nodeType === Node.ELEMENT_NODE && node !== element);
}

export function getAttributeOrDefault(element: HTMLElement, attr: string, defaultValue: string): string {
  const value = element.getAttribute(attr);
  if (value === null) {
    element.setAttribute(attr, defaultValue);
    return defaultValue;
  }
  return value;
}

export function containsClass(element: Element, className: string): boolean {
  return element.classList.contains(className);
}
