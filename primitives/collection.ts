// Local array operations — filter, sort, group, aggregate, select, distinct.
// applyQuery() applies a Query (from query.ts) to a plain array without any network calls.

import { getField, FilterValue }   from './predicate.ts';
import {
  DataQuery, QueryOp,
  WhereOp, SearchOp, SortOp, GroupOp,
  PageOp, RangeOp, TakeOp, SkipOp,
  SelectOp, AggregateOp,
} from './data-query.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AggregateType =
  | 'sum' | 'average' | 'min' | 'max'
  | 'count' | 'truecount' | 'falsecount';

export interface GroupEntry<T> {
  key:        unknown;
  field:      string;
  count:      number;
  items:      T[];
  aggregates: Record<string, number>;
}

export interface QueryResult<T> {
  result:     T[];
  count:      number;
  aggregates: Record<string, number>;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getVal(record: Record<string, unknown>, field: string): unknown {
  return field ? getField(field, record) : record;
}

/** Write a value into a nested dot-path on obj (mutates obj, returns it). */
function setField(path: string, value: unknown, obj: Record<string, unknown>): Record<string, unknown> {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length; i++) {
    if (i + 1 === keys.length) {
      cur[keys[i]] = value;
    } else {
      if (cur[keys[i]] == null || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {};
      cur = cur[keys[i]] as Record<string, unknown>;
    }
  }
  return obj;
}

// ─── Standalone utilities ────────────────────────────────────────────────────

/**
 * Sort an array by a field, returning a new array.
 *
 * @example sort(users, 'name')
 * @example sort(users, 'price', 'descending')
 * @example sort(users, 'age', (a, b) => (a as number) - (b as number))
 */
export function sort<T extends Record<string, unknown>>(
  data:      T[],
  field:     string,
  comparer?: 'ascending' | 'descending' | ((a: unknown, b: unknown) => number),
): T[] {
  if (data.length <= 1) return data;

  let cmp: (a: unknown, b: unknown) => number;
  if (typeof comparer === 'function') {
    cmp = comparer;
  } else {
    const desc = comparer === 'descending';
    cmp = (a, b) => {
      if (a == null && b == null) return 0;
      if (b == null) return desc ? 1 : -1;
      if (a == null) return desc ? -1 : 1;
      if (typeof a === 'string') return desc ? (a as string).localeCompare(b as string) * -1 : (a as string).localeCompare(b as string);
      return desc ? (b as number) - (a as number) : (a as number) - (b as number);
    };
  }

  return [...data].sort((a, b) => cmp(getVal(a, field), getVal(b, field)));
}

/**
 * Project specific dot-path fields from each record.
 *
 * @example select(users, ['id', 'address.city'])
 */
export function select<T extends Record<string, unknown>>(
  data:   T[],
  fields: string[],
): Partial<T>[] {
  return data.map(rec => {
    const out: Record<string, unknown> = {};
    for (const f of fields) setField(f, getField(f, rec), out);
    return out as Partial<T>;
  });
}

/**
 * Return distinct values for a field (or whole records when requiresCompleteRecord is true).
 *
 * @example distinct(users, 'role')           // ['admin', 'user', 'mod']
 * @example distinct(users, 'role', true)     // full records, one per unique role
 */
export function distinct<T extends Record<string, unknown>>(
  data:                  T[],
  field:                 string,
  requiresCompleteRecord = false,
): unknown[] {
  const seen = new Set<unknown>();
  const result: unknown[] = [];
  for (const rec of data) {
    const val = getVal(rec, field);
    if (!seen.has(val)) {
      seen.add(val);
      result.push(requiresCompleteRecord ? rec : val);
    }
  }
  return result;
}

/**
 * Compute an aggregate over an array of records.
 *
 * Supported types: sum, average, min, max, count, truecount, falsecount
 *
 * @example aggregate(orders, 'amount', 'sum')
 */
export function aggregate(
  data:  Record<string, unknown>[],
  field: string,
  type:  AggregateType | string,
): number {
  switch (type) {
    case 'count':
      return data.length;

    case 'sum': {
      let total = 0;
      for (const rec of data) {
        const v = getVal(rec, field);
        if (v != null && !isNaN(Number(v))) total += Number(v);
      }
      return total;
    }

    case 'average':
      return data.length ? aggregate(data, field, 'sum') / data.length : 0;

    case 'min': {
      let min: unknown = undefined;
      for (const rec of data) {
        const v = getVal(rec, field);
        if (v == null) continue;
        if (min === undefined || compare(v, min) < 0) min = v;
      }
      return min as number;
    }

    case 'max': {
      let max: unknown = undefined;
      for (const rec of data) {
        const v = getVal(rec, field);
        if (v == null) continue;
        if (max === undefined || compare(v, max) > 0) max = v;
      }
      return max as number;
    }

    case 'truecount':
      return data.filter(rec => getVal(rec, field) === true).length;

    case 'falsecount':
      return data.filter(rec => getVal(rec, field) === false).length;

    default:
      throw new Error(`aggregate: unknown type "${type}"`);
  }
}

function compare(a: unknown, b: unknown): number {
  if (typeof a === 'string') return a.localeCompare(b as string);
  return (a as number) - (b as number);
}

/**
 * Group records by a field value, with optional per-group aggregates.
 *
 * @example
 * groupBy(orders, 'status')
 *
 * @example
 * groupBy(orders, 'category', [
 *   { field: 'amount', type: 'sum' },
 *   { field: 'id',     type: 'count' },
 * ])
 */
export function groupBy<T extends Record<string, unknown>>(
  data:       T[],
  field:      string,
  aggregates: { field: string; type: AggregateType | string }[] = [],
  format?:    (val: unknown, field: string) => unknown,
): GroupEntry<T>[] {
  const map   = new Map<unknown, GroupEntry<T>>();
  const order: unknown[] = [];

  for (const rec of data) {
    let key: unknown = getVal(rec, field);
    if (format) key = format(key, field);

    if (!map.has(key)) {
      const entry: GroupEntry<T> = { key, field, count: 0, items: [], aggregates: {} };
      map.set(key, entry);
      order.push(key);
    }

    const entry = map.get(key)!;
    entry.count++;
    entry.items.push(rec);
  }

  if (aggregates.length) {
    for (const entry of map.values()) {
      for (const agg of aggregates) {
        const k = `${agg.field} - ${agg.type}`;
        entry.aggregates[k] = aggregate(entry.items as Record<string, unknown>[], agg.field, agg.type);
      }
    }
  }

  return order.map(k => map.get(k)!);
}

// ─── applyQuery ───────────────────────────────────────────────────────────────

/**
 * Apply a Query to a local array and return the filtered, sorted, paged result.
 *
 * Supported operations: where, search, sortBy, skip, take, page, range, select, aggregate.
 * Group ops in the query are collected but NOT applied here — call groupBy() separately.
 *
 * @example
 * const q = new Query()
 *   .where('status', 'equal', 'active')
 *   .sortBy('name')
 *   .page(1, 25)
 *   .requiresCount()
 *   .aggregate('sum', 'revenue');
 *
 * const { result, count, aggregates } = applyQuery(orders, q);
 * // count reflects the total before pagination (because requiresCount was set)
 * // aggregates['revenue - sum'] is the sum across the current page
 *
 * @example
 * // Group after applying filters
 * const { result } = applyQuery(products, filterQuery);
 * const groups = groupBy(result, 'category', [{ field: 'price', type: 'average' }]);
 */
export function applyQuery<T extends Record<string, unknown>>(
  data:  T[],
  query: DataQuery,
): QueryResult<T> {
  // Split ops by phase
  const filterOps: (WhereOp | SearchOp)[] = [];
  const sortOps:   SortOp[]               = [];
  const aggOps:    AggregateOp[]          = [];
  let   selectOp:  SelectOp | null        = null;
  const pageOps:   QueryOp[]              = [];

  for (const op of query.queries) {
    switch (op.fn) {
      case 'onWhere':        filterOps.push(op as WhereOp);   break;
      case 'onSearch':       filterOps.push(op as SearchOp);  break;
      case 'onSortBy':       sortOps.push(op as SortOp);      break;
      case 'onAggregates':   aggOps.push(op as AggregateOp);  break;
      case 'onSelect':       selectOp = op as SelectOp;       break;
      case 'onSkip':
      case 'onTake':
      case 'onPage':
      case 'onRange':        pageOps.push(op);                break;
      case 'onGroup':        /* handled externally */         break;
    }
  }

  // Phase 1 — filter
  let result: T[] = data;

  for (const op of filterOps) {
    if (op.fn === 'onWhere') {
      result = result.filter(r => (op as WhereOp).e.validate(r as Record<string, unknown>));
    } else {
      const s = (op as SearchOp).e;
      result = result.filter(r => {
        const fields = s.fieldNames ?? (Object.keys(r) as string[]);
        return fields.some(f =>
          s.comparer(
            getField(f, r as Record<string, unknown>),
            s.searchKey as FilterValue,
            s.ignoreCase,
            s.ignoreAccent,
          )
        );
      });
    }
  }

  // Phase 2 — sort: all sort ops are combined into a single comparator,
  // first sortBy has highest priority (tiebroken by subsequent ones).
  if (sortOps.length) {
    result = [...result].sort((a, b) => {
      for (const op of sortOps) {
        const { fieldName, comparer } = op.e;
        const fields = typeof fieldName === 'string' ? [fieldName] : fieldName;
        for (const f of fields) {
          const n = comparer(
            getField(f, a as Record<string, unknown>),
            getField(f, b as Record<string, unknown>),
            a,
            b,
          );
          if (n !== 0) return n;
        }
      }
      return 0;
    });
  }

  // Phase 3 — capture pre-pagination totals
  const prePageTotal = query.isCountRequired ? result.length : -1;

  // Phase 4 — compute aggregates on filtered+sorted data (before pagination)
  const aggregates: Record<string, number> = {};
  for (const agg of aggOps) {
    const { field, type } = agg.e;
    aggregates[`${field} - ${type}`] = aggregate(
      result as Record<string, unknown>[],
      field,
      type as AggregateType,
    );
  }

  // Phase 5 — paginate
  for (const op of pageOps) {
    switch (op.fn) {
      case 'onSkip':
        result = result.slice((op as SkipOp).e.nos);
        break;
      case 'onTake':
        result = result.slice(0, (op as TakeOp).e.nos);
        break;
      case 'onPage': {
        const { pageIndex, pageSize } = (op as PageOp).e;
        const start = (pageIndex - 1) * pageSize;
        result = result.slice(start, start + pageSize);
        break;
      }
      case 'onRange': {
        const { start, end } = (op as RangeOp).e;
        result = result.slice(start, end);
        break;
      }
    }
  }

  // Phase 6 — project fields
  if (selectOp) {
    result = result.map(r => {
      const out: Record<string, unknown> = {};
      for (const f of (selectOp as SelectOp).e.fieldNames) {
        setField(f, getField(f, r as Record<string, unknown>), out);
      }
      return out as T;
    });
  }

  return {
    result,
    count: prePageTotal !== -1 ? prePageTotal : result.length,
    aggregates,
  };
}
