// ─── observer ────────────────────────────────────────────────────────────────
export { Observer } from './observer.ts';
export type { Handler } from './observer.ts';

// ─── dom ─────────────────────────────────────────────────────────────────────
export {
  createElement, setAttributes, setStyleAttribute, updateCSSText,
  addClass, removeClass, toggleClasses,
  isVisible, prepend, append, detach, remove,
  siblings, getAttributeOrDefault, containsClass,
} from './dom.ts';
export type { ElementProperties, StyleMap, AttrMap, AnyElement } from './dom.ts';

// ─── query ───────────────────────────────────────────────────────────────────
export { query, queryAll, queryClosest, exists, byId } from './query.ts';

// ─── sanitize ────────────────────────────────────────────────────────────────
export { sanitize, DEFAULT_REMOVE_TAGS, DEFAULT_REMOVE_ATTRS } from './sanitize.ts';
export type { SanitizeRules, SanitizeAttrsRule } from './sanitize.ts';

// ─── easing ──────────────────────────────────────────────────────────────────
export { EASING, cssEasing, applyTransition, clearTransition } from './easing.ts';
export type { EasingName } from './easing.ts';

// ─── keyboard ────────────────────────────────────────────────────────────────
export { KEY_CODES, parseShortcut, matchesShortcut, matchesAny } from './keyboard.ts';
export type { ParsedShortcut } from './keyboard.ts';

// ─── hotkeys ─────────────────────────────────────────────────────────────────
export { hotkeys } from './hotkeys.ts';
export type { HotkeyMap } from './hotkeys.ts';

// ─── ripple ──────────────────────────────────────────────────────────────────
export { ripple, useRippleEffect } from './ripple.ts';
export type { RippleOptions } from './ripple.ts';

// ─── drag ────────────────────────────────────────────────────────────────────
export { drag } from './drag.ts';
export type { DragOptions, DragPos } from './drag.ts';

// ─── gesture ─────────────────────────────────────────────────────────────────
export { onSwipe, swipeDirection, swipeVelocity } from './gesture.ts';
export type { SwipeDirection, SwipePoint, SwipeEvent, SwipeOptions } from './gesture.ts';

// ─── storage ─────────────────────────────────────────────────────────────────
export { local, session } from './storage.ts';
export type { StorageOptions } from './storage.ts';

// ─── resize ──────────────────────────────────────────────────────────────────
export { onResize } from './resize.ts';
export type { ResizeEntry } from './resize.ts';

// ─── intersection ────────────────────────────────────────────────────────────
export { onIntersect, onceVisible } from './intersection.ts';
export type { IntersectEntry, IntersectOptions } from './intersection.ts';

// ─── predicate ───────────────────────────────────────────────────────────────
export { Predicate, getField, resolveOp } from './predicate.ts';
export type { FilterOperator, FilterValue, PredicateJson } from './predicate.ts';

// ─── data-query ──────────────────────────────────────────────────────────────
export { DataQuery } from './data-query.ts';
export type {
  SortOrder, SortComparer, ParamOption,
  QueryOp, WhereOp, SearchOp, SortOp, GroupOp,
  PageOp, RangeOp, TakeOp, SkipOp, SelectOp, AggregateOp,
} from './data-query.ts';

// ─── collection ──────────────────────────────────────────────────────────────
export { applyQuery, sort, select, distinct, groupBy, aggregate } from './collection.ts';
export type { AggregateType, GroupEntry, QueryResult } from './collection.ts';

// ─── utils ───────────────────────────────────────────────────────────────────
export {
  // type guards
  isNullOrUndefined, isUndefined, isObject, isObjectArray,
  // object
  getValue, setValue, deleteObject, extend,
  // unique id
  getUniqueID, uniqueID,
  // function
  debounce, throttle, defer,
  // dom
  compareElementParent, formatUnit,
  // url / error
  queryParams, throwError,
  // math
  clamp, lerp, mapRange,
} from './utils.ts';
