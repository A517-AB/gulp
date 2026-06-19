// Composable, serializable filter expressions — ported from ej2-data's Predicate class,
// stripped of all Syncfusion coupling and rewritten in strict TypeScript.

export type FilterOperator =
  | 'equal'           | 'notequal'
  | 'lessthan'        | 'greaterthan'
  | 'lessthanorequal' | 'greaterthanorequal'
  | 'contains'        | 'doesnotcontain'
  | 'startswith'      | 'doesnotstartwith'
  | 'endswith'        | 'doesnotendwith'
  | 'isnull'          | 'isnotnull'
  | 'isempty'         | 'isnotempty'
  | 'wildcard'        | 'like'
  | 'in'              | 'notin';

export type FilterValue =
  | string | number | boolean | Date
  | (string | number | boolean | Date)[]
  | null | undefined;

type CompareFn = (
  actual:       unknown,
  expected:     FilterValue,
  ignoreCase?:  boolean,
  ignoreAccent?: boolean,
) => boolean;

// ─── Internal string helpers ─────────────────────────────────────────────────

function toLower(val: unknown): string {
  if (val == null)                 return '';
  if (typeof val === 'string')     return val.toLowerCase();
  if (val instanceof Date)         return val.toString().toLowerCase();
  return String(val).toLowerCase();
}

// Uses Unicode normalization — smaller and more correct than a lookup table.
function stripAccents(val: unknown): unknown {
  if (typeof val !== 'string') return val;
  return val.normalize('NFD').replace(/\p{Mn}/gu, '');
}

function sw(s: string, prefix: string): boolean {
  return s.slice(0, prefix.length) === prefix;
}

function ew(s: string, suffix: string): boolean {
  return suffix.length === 0 || s.slice(-suffix.length) === suffix;
}

function wildcardTest(input: string, pattern: string): boolean {
  let p = pattern
    .replace(/\[/g,  '[[]')
    .replace(/\(/g,  '[(]')
    .replace(/\)/g,  '[)]')
    .replace(/\\/g,  '[\\\\]');

  if (p.includes('*')) {
    if (!p.startsWith('*')) p = '^' + p;
    if (!p.endsWith('*'))   p = p + '$';
    p = p.split('*').map(seg => seg.includes('.') ? seg + '*' : seg + '.*').join('');
  }

  if (p.includes('%3f') || p.includes('?')) {
    p = (p.includes('%3f') ? p.split('%3f') : p.split('?')).join('.');
  }

  return new RegExp(p, 'g').test(input);
}

function likeTest(input: string, pattern: string): boolean {
  if (!pattern.includes('%')) return false;
  const fi = pattern.indexOf('%');
  const li = pattern.lastIndexOf('%');
  if (pattern[0] === '%' && li < 2)              return sw(toLower(input), toLower(pattern.slice(1)));
  if (pattern[pattern.length - 1] === '%' && fi > pattern.length - 3) return ew(toLower(input), toLower(pattern.slice(0, -1)));
  return input.includes(pattern.slice(fi + 1, li));
}

// ─── Operator implementations ─────────────────────────────────────────────────

const OPS: Record<string, CompareFn> = {
  equal(a, e, ic, ia) {
    if (ia) { a = stripAccents(a); e = stripAccents(e) as FilterValue; }
    return ic ? toLower(a) === toLower(e) : a === e;
  },
  notequal(a, e, ic, ia) { return !OPS['equal']!(a, e, ic, ia); },

  lessthan(a, e, ic)           { return ic ? toLower(a) < toLower(e)  : (a as number) < (e as number); },
  greaterthan(a, e, ic)        { return ic ? toLower(a) > toLower(e)  : (a as number) > (e as number); },
  lessthanorequal(a, e, ic)    { return ic ? toLower(a) <= toLower(e) : (a as number) <= (e as number); },
  greaterthanorequal(a, e, ic) { return ic ? toLower(a) >= toLower(e) : (a as number) >= (e as number); },

  contains(a, e, ic, ia) {
    if (e === '') return true;
    if (a == null || e == null) return false;
    if (ia) { a = stripAccents(a); e = stripAccents(e) as FilterValue; }
    return ic
      ? toLower(a).includes(toLower(e))
      : String(a).includes(String(e));
  },
  doesnotcontain(a, e, ic, ia) { return e !== '' && !OPS['contains']!(a, e, ic, ia); },

  startswith(a, e, ic, ia) {
    if (e === '') return true;
    if (a == null || e == null) return false;
    if (ia) { a = stripAccents(a); e = stripAccents(e) as FilterValue; }
    return ic ? sw(toLower(a), toLower(e)) : sw(String(a), String(e));
  },
  doesnotstartwith(a, e, ic, ia) { return e !== '' && !OPS['startswith']!(a, e, ic, ia); },

  endswith(a, e, ic, ia) {
    if (e === '') return true;
    if (a == null || e == null) return false;
    if (ia) { a = stripAccents(a); e = stripAccents(e) as FilterValue; }
    return ic ? ew(toLower(a), toLower(e)) : ew(String(a), String(e));
  },
  doesnotendwith(a, e, ic, ia) { return e !== '' && !OPS['endswith']!(a, e, ic, ia); },

  isnull:     (a) => a === null || a === undefined,
  isnotnull:  (a) => a !== null && a !== undefined,
  isempty:    (a) => a === undefined || a === '',
  isnotempty: (a) => a !== undefined && a !== '',

  wildcard(a, e, ic, ia) {
    if (a == null || e == null) return false;
    if (ia) { a = stripAccents(a); e = stripAccents(e) as FilterValue; }
    return wildcardTest(ic ? toLower(a) : String(a), ic ? toLower(e) : String(e));
  },
  like(a, e, ic, ia) {
    if (a == null || e == null) return false;
    if (ia) { a = stripAccents(a); e = stripAccents(e) as FilterValue; }
    return likeTest(ic ? toLower(a) : String(a), ic ? toLower(e) : String(e));
  },

  in(a, e, ic, ia) {
    const arr = e as (string | number | boolean | Date)[];
    if (!arr?.length) return false;
    if (ia) a = stripAccents(a);
    if (a instanceof Date) return arr.some(i => i instanceof Date && i.getTime() === (a as Date).getTime());
    if (ic) {
      const lc = toLower(ia ? stripAccents(a) : a);
      return arr.some(i => toLower(ia ? stripAccents(i) : i) === lc);
    }
    return arr.includes(a as string | number | boolean);
  },
  notin(a, e, ic, ia) { return !OPS['in']!(a, e, ic, ia); },
};

const SYMBOLS: Record<string, string> = {
  '<': 'lessthan', '>': 'greaterthan',
  '<=': 'lessthanorequal', '>=': 'greaterthanorequal',
  '==': 'equal', '!=': 'notequal',
  '*=': 'contains', '$=': 'endswith', '^=': 'startswith',
};

/** Resolve an operator name or symbol to its compare function. */
export function resolveOp(operator: string): CompareFn {
  const fn = OPS[operator] ?? OPS[SYMBOLS[operator] ?? ''];
  if (!fn) throw new Error(`Predicate: unknown operator "${operator}"`);
  return fn;
}

// ─── getField ─────────────────────────────────────────────────────────────────

/**
 * Access a nested property by dot-separated path.
 * Falls back to camelCase / PascalCase at each segment (matches EJ2 DataUtil.getObject).
 *
 * @example getField('user.address.city', record)
 */
export function getField(path: string, obj: Record<string, unknown>): unknown {
  if (!path) return obj;
  if (!obj)  return undefined;

  if (!path.includes('.')) {
    if (path in obj) return obj[path];
    const lc = (path[0] ?? '').toLowerCase() + path.slice(1);
    const uc = (path[0] ?? '').toUpperCase() + path.slice(1);
    return obj[lc] ?? obj[uc] ?? null;
  }

  let cur: unknown = obj;
  for (const seg of path.split('.')) {
    if (cur == null) return null;
    const rec = cur as Record<string, unknown>;
    if (seg in rec) {
      cur = rec[seg];
    } else {
      const lc = (seg[0] ?? '').toLowerCase() + seg.slice(1);
      const uc = (seg[0] ?? '').toUpperCase() + seg.slice(1);
      cur = rec[lc] ?? rec[uc] ?? null;
    }
  }
  return cur;
}

// ─── Predicate ────────────────────────────────────────────────────────────────

export interface PredicateJson {
  isComplex:    boolean;
  field?:       string;
  operator?:    string;
  value?:       FilterValue;
  ignoreCase?:  boolean;
  ignoreAccent?: boolean;
  matchCase?:   boolean;
  condition?:   string;
  predicates?:  PredicateJson[];
}

/**
 * Composable, serializable filter expression.
 *
 * @example
 * // Simple
 * new Predicate('age', 'greaterthan', 18)
 *
 * @example
 * // Chained
 * new Predicate('age', 'greaterthan', 18)
 *   .and('status', 'equal', 'active')
 *   .or('role', 'equal', 'admin')
 *
 * @example
 * // Static combinators
 * Predicate.and(
 *   new Predicate('status', 'equal', 'active'),
 *   new Predicate('age', 'greaterthanorequal', 21),
 * )
 *
 * @example
 * // Validate a record
 * const p = new Predicate('name', 'startswith', 'J', true); // ignoreCase
 * records.filter(r => p.validate(r))
 *
 * @example
 * // Serialize / deserialize
 * const json = p.toJson();
 * const p2 = Predicate.fromJson(json) as Predicate;
 */
export class Predicate {
  field?:       string;
  operator?:    string;
  value?:       FilterValue;
  ignoreCase:   boolean   = false;
  ignoreAccent: boolean   = false;
  matchCase?:   boolean;
  isComplex:    boolean   = false;
  condition?:   string;
  predicates?:  Predicate[];

  private comparer?: CompareFn;

  constructor(
    field:        string | Predicate,
    operator:     string,
    value?:       FilterValue | Predicate | Predicate[],
    ignoreCase?:  boolean,
    ignoreAccent?: boolean,
    matchCase?:   boolean,
  ) {
    if (typeof field === 'string') {
      this.field       = field;
      this.operator    = operator.toLowerCase();
      this.value       = value as FilterValue;
      this.ignoreCase  = ignoreCase  ?? false;
      this.ignoreAccent = ignoreAccent ?? false;
      if (matchCase !== undefined) this.matchCase = matchCase;
      this.comparer    = resolveOp(this.operator);
    } else {
      this.isComplex   = true;
      this.condition   = operator.toLowerCase();
      this.ignoreCase  = field.ignoreCase;
      this.ignoreAccent = field.ignoreAccent;
      if (field.matchCase !== undefined) this.matchCase = field.matchCase;
      this.predicates  = [field];
      if (Array.isArray(value)) {
        this.predicates.push(...(value as Predicate[]));
      } else if (value instanceof Predicate) {
        this.predicates.push(value);
      }
    }
  }

  // ── Static combinators ────────────────────────────────────────────────────

  /** Accepts either spread args `Predicate.and(p1, p2)` or a single array `Predicate.and([p1, p2])`. */
  static and(first: Predicate | Predicate[], ...rest: Predicate[]): Predicate {
    const preds = Array.isArray(first) ? first : [first, ...rest];
    return preds.length === 1 ? preds[0]! : new Predicate(preds[0]!, 'and', preds.slice(1));
  }

  static or(first: Predicate | Predicate[], ...rest: Predicate[]): Predicate {
    const preds = Array.isArray(first) ? first : [first, ...rest];
    return preds.length === 1 ? preds[0]! : new Predicate(preds[0]!, 'or', preds.slice(1));
  }

  static andnot(first: Predicate | Predicate[], ...rest: Predicate[]): Predicate {
    const preds = Array.isArray(first) ? first : [first, ...rest];
    return preds.length === 1 ? preds[0]! : new Predicate(preds[0]!, 'and not', preds.slice(1));
  }

  static ornot(first: Predicate | Predicate[], ...rest: Predicate[]): Predicate {
    const preds = Array.isArray(first) ? first : [first, ...rest];
    return preds.length === 1 ? preds[0]! : new Predicate(preds[0]!, 'or not', preds.slice(1));
  }

  // ── Instance chainers ─────────────────────────────────────────────────────

  and(field: string | Predicate, op?: string, val?: FilterValue, ic?: boolean, ia?: boolean): Predicate {
    return this._chain('and', field, op, val, ic, ia);
  }

  or(field: string | Predicate, op?: string, val?: FilterValue, ic?: boolean, ia?: boolean): Predicate {
    return this._chain('or', field, op, val, ic, ia);
  }

  andnot(field: string | Predicate, op?: string, val?: FilterValue, ic?: boolean, ia?: boolean): Predicate {
    return this._chain('and not', field, op, val, ic, ia);
  }

  ornot(field: string | Predicate, op?: string, val?: FilterValue, ic?: boolean, ia?: boolean): Predicate {
    return this._chain('or not', field, op, val, ic, ia);
  }

  private _chain(
    cond:  string,
    field: string | Predicate,
    op?:   string,
    val?:  FilterValue,
    ic?:   boolean,
    ia?:   boolean,
  ): Predicate {
    const other = field instanceof Predicate
      ? field
      : new Predicate(field, op!, val, ic, ia);
    return new Predicate(this, cond, other);
  }

  // ── Validate ──────────────────────────────────────────────────────────────

  /**
   * Test a single record against this predicate.
   *
   * @example
   * const activeAdults = Predicate.and(
   *   new Predicate('age', 'greaterthan', 18),
   *   new Predicate('status', 'equal', 'active'),
   * );
   * const result = users.filter(u => activeAdults.validate(u));
   */
  validate(record: Record<string, unknown>): boolean {
    if (!this.isComplex) {
      return this.comparer!(
        getField(this.field!, record),
        this.value!,
        this.ignoreCase,
        this.ignoreAccent,
      );
    }

    const preds  = this.predicates ?? [];
    const cond   = this.condition ?? 'and';
    const hasNot = cond.includes('not');
    // 'and not' → isAnd=true; 'or not' → isAnd=false
    const isAnd  = hasNot ? cond.includes('and') : cond === 'and';

    for (let i = 0; i < preds.length; i++) {
      const result    = preds[i]!.validate(record);
      // EJ2 semantics: first predicate is not negated; subsequent ones are (for 'x not' conditions)
      const effective = hasNot && i > 0 ? !result : result;

      if (isAnd  && !effective) return false;
      if (!isAnd &&  effective) return true;
    }
    return isAnd;
  }

  // ── Serialization ─────────────────────────────────────────────────────────

  toJson(): PredicateJson {
    return {
      isComplex:    this.isComplex,
      ...(this.field      !== undefined && { field:      this.field }),
      ...(this.operator   !== undefined && { operator:   this.operator }),
      ...(this.value      !== undefined && { value:      this.value }),
      ignoreCase:   this.ignoreCase,
      ignoreAccent: this.ignoreAccent,
      ...(this.matchCase  !== undefined && { matchCase:  this.matchCase }),
      ...(this.condition  !== undefined && { condition:  this.condition }),
      ...(this.predicates !== undefined && { predicates: this.predicates.map(p => p.toJson()) }),
    };
  }

  static fromJson(json: PredicateJson | PredicateJson[]): Predicate | Predicate[] {
    if (Array.isArray(json)) return json.map(j => Predicate._fromData(j));
    return Predicate._fromData(json);
  }

  private static _fromData(json: PredicateJson): Predicate {
    if (!json.isComplex) {
      return new Predicate(json.field!, json.operator!, json.value, json.ignoreCase, json.ignoreAccent);
    }
    const preds = (json.predicates ?? []).map(p => Predicate._fromData(p));
    return new Predicate(preds[0]!, json.condition!, preds.slice(1));
  }
}
