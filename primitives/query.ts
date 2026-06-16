/// <reference lib="dom" />

export function query<T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T | null {
  return root.querySelector<T>(selector);
}

export function queryAll<T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

export function queryClosest<T extends Element = HTMLElement>(
  element: Element,
  selector: string,
): T | null {
  return element.closest<T>(selector);
}

export function exists(selector: string, root: ParentNode = document): boolean {
  return root.querySelector(selector) !== null;
}

export function byId<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}
