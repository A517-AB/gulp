// Fluent query builder — ported from ej2-data's Query class.
// DataManager and remote adaptor coupling has been removed entirely.
// Use with applyQuery() from collection.ts to execute against local arrays.

import { Predicate, resolveOp } from './predicate.ts';
import type { FilterValue } from './predicate.ts';

export type SortOrder    = 'ascending' | 'descending';
export type SortComparer = (a: unknown, b: unknown, aRec?: unknown, bRec?: unknown) => number;

// ─── Internal operation shapes (consumed by applyQuery) ───────────────────────

export type WhereOp = {
  fn: 'onWhere';
  e:  Predicate;
};

export type SearchOp = {
  fn: 'onSearch';
  e:  {
    fieldNames?:   string[];
    operator:      string;
    searchKey:     string | number | boolean;
    ignoreCase?:   boolean;
    ignoreAccent?: boolean;
    comparer:      (actual: unknown, expected: FilterValue, ic?: boolean, ia?: boolean) => boolean;
  };
};

export type SortOp = {
  fn: 'onSortBy';
  e:  {
    fieldName:        string | string[];
    comparer:         SortComparer;
    direction:        string;
    foreignKeyValue?: string;
  };
};

export type GroupOp = {
  fn: 'onGroup';
  e:  {
    fieldName: string;
    comparer?: ((a: unknown, b: unknown) => number) | null;
    format?:   ((val: unknown, field: string) => unknown) | null;
  };
};

export type PageOp       = { fn: 'onPage';       e: { pageIndex: number; pageSize: number } };
export type RangeOp      = { fn: 'onRange';       e: { start: number; end: number } };
export type TakeOp       = { fn: 'onTake';        e: { nos: number } };
export type SkipOp       = { fn: 'onSkip';        e: { nos: number } };
export type SelectOp     = { fn: 'onSelect';      e: { fieldNames: string[] } };
export type AggregateOp  = { fn: 'onAggregates';  e: { field: string; type: string } };

export type QueryOp =
  | WhereOp | SearchOp | SortOp | GroupOp
  | PageOp  | RangeOp  | TakeOp | SkipOp
  | SelectOp | AggregateOp;

export interface ParamOption {
  key:    string;
  value?: string;
  fn?:    () => string;
}

// ─── Sort comparers ───────────────────────────────────────────────────────────

function ascend(x: unknown, y: unknown): number {
  if (x == null && y == null) return 0;
  if (y == null) return -1;
  if (x == null) return 1;
  if (typeof x === 'string') return (x as string).localeCompare(y as string);
  return (x as number) - (y as number);
}

function descend(x: unknown, y: unknown): number {
  if (x == null && y == null) return 0;
  if (y == null) return 1;
  if (x == null) return -1;
  if (typeof x === 'string') return (x as string).localeCompare(y as string) * -1;
  return (y as number) - (x as number);
}

function sortComparer(order?: string | null): SortComparer {
  return (order ?? 'ascending').toLowerCase() === 'ascending' ? ascend : descend;
}

// ─── DataQuery ────────────────────────────────────────────────────────────────

/**
 * Fluent query builder for describing filter, sort, page, group, and aggregate
 * operations on a data source.
 *
 * Apply to a local array with applyQuery() from collection.ts.
 *
 * @example
 * import { DataQuery } from './data-query.ts';
 * import { applyQuery } from './collection.ts';
 *
 * const q = new DataQuery()
 *   .where('status', 'equal', 'active')
 *   .sortBy('name')
 *   .page(1, 20)
 *   .requiresCount();
 *
 * const { result, count } = applyQuery(users, q);
 *
 * @example
 * // Predicate-based filter
 * import { Predicate } from './predicate.ts';
 * const p = Predicate.or(
 *   new Predicate('role', 'equal', 'admin'),
 *   new Predicate('role', 'equal', 'mod'),
 * );
 * new DataQuery().where(p).sortBy('name')
 *
 * @example
 * // Aggregates
 * new DataQuery()
 *   .where('status', 'equal', 'active')
 *   .aggregate('sum', 'revenue')
 *   .aggregate('count', 'id')
 *   .requiresCount()
 */
export class DataQuery {
  queries:         QueryOp[]      = [];
  sortedColumns:   string[]       = [];
  groupedColumns:  string[]       = [];
  params:          ParamOption[]  = [];
  expands:         (string | Record<string, unknown>)[] = [];
  distincts:       string[]       = [];

  fromTable?:      string;
  key:             string  = '';
  fKey:            string  = '';
  isCountRequired: boolean = false;
  subQuery?:       DataQuery;

  constructor(from?: string | string[]) {
    if (typeof from === 'string') {
      this.fromTable = from;
    } else if (Array.isArray(from)) {
      this.expands = from;
    }
  }

  // ── Table / key ───────────────────────────────────────────────────────────

  from(tableName: string): this {
    this.fromTable = tableName;
    return this;
  }

  setKey(field: string): this {
    this.key = field;
    return this;
  }

  foreignKey(key: string): this {
    this.fKey = key;
    return this;
  }

  requiresCount(): this {
    this.isCountRequired = true;
    return this;
  }

  // ── Filtering ────────────────────────────────────────────────────────────

  /**
   * Filter rows by field + operator + value, or by a pre-built Predicate.
   *
   * @example
   * .where('price', 'lessthan', 100)
   * .where('name', 'startswith', 'J', true)   // ignoreCase
   * .where(Predicate.or(p1, p2))
   */
  where(
    fieldOrPredicate: string | Predicate,
    operator?:     string,
    value?:        FilterValue,
    ignoreCase?:   boolean,
    ignoreAccent?: boolean,
    matchCase?:    boolean,
  ): this {
    const pred = fieldOrPredicate instanceof Predicate
      ? fieldOrPredicate
      : new Predicate(
          fieldOrPredicate,
          (operator ?? 'equal').toLowerCase(),
          value,
          ignoreCase,
          ignoreAccent,
          matchCase,
        );

    this.queries.push({ fn: 'onWhere', e: pred });
    return this;
  }

  /**
   * Full-text search across one or more fields.
   *
   * @example
   * .search('john', ['firstName', 'lastName', 'email'], 'contains', true)
   */
  search(
    searchKey:     string | number | boolean,
    fieldNames?:   string | string[],
    operator?:     string,
    ignoreCase?:   boolean,
    ignoreAccent?: boolean,
  ): this {
    const fields = typeof fieldNames === 'string' ? [fieldNames] : fieldNames;
    const op     = (!operator || operator === 'none') ? 'contains' : operator;
    this.queries.push({
      fn: 'onSearch',
      e:  {
        ...(fields      !== undefined && { fieldNames:   fields }),
        ...(ignoreCase  !== undefined && { ignoreCase }),
        ...(ignoreAccent !== undefined && { ignoreAccent }),
        operator:     op,
        searchKey,
        comparer:     resolveOp(op),
      },
    });
    return this;
  }

  // ── Sorting ───────────────────────────────────────────────────────────────

  /**
   * Sort by field (default ascending).
   *
   * @param comparer  Direction string or custom comparer function.
   *
   * @example
   * .sortBy('name')
   * .sortBy('price', 'descending')
   * .sortBy('id', (a, b) => Number(a) - Number(b))
   * .sortBy('name desc')   // shorthand
   */
  sortBy(
    fieldName:   string | string[],
    comparer?:   string | SortComparer | null,
    _fromGroup?: boolean,
  ): this {
    return this._addSort(fieldName, comparer, _fromGroup);
  }

  sortByDesc(fieldName: string): this {
    return this._addSort(fieldName, 'descending');
  }

  private _addSort(
    fieldName:       string | string[],
    comparer?:       string | SortComparer | null,
    _fromGroup?:     boolean,
    direction?:      string,
    foreignKeyValue?: string,
  ): this {
    let order = direction ?? 'ascending';
    let cmp: SortComparer;

    // Support 'fieldName desc' shorthand
    if (typeof fieldName === 'string' && fieldName.toLowerCase().endsWith(' desc')) {
      fieldName = fieldName.replace(/ desc$/i, '');
      comparer  = 'descending';
    }

    if (!comparer || typeof comparer === 'string') {
      order = comparer ? (comparer as string).toLowerCase() : 'ascending';
      cmp   = sortComparer(order);
    } else {
      cmp = comparer;
    }

    // When called from group(), skip if this field already has a sort op
    if (_fromGroup) {
      const existing = DataQuery.filterQueries(this.queries, 'onSortBy') as SortOp[];
      const alreadySorted = existing.some(s => {
        const n = s.e.fieldName;
        return n === fieldName ||
          (Array.isArray(n) && n.some(f => f === fieldName || f.toLowerCase() === `${fieldName as string} desc`));
      });
      if (alreadySorted) return this;
    }

    const op: SortOp = { fn: 'onSortBy', e: { fieldName, comparer: cmp, direction: order } };
    if (foreignKeyValue != null) op.e.foreignKeyValue = foreignKeyValue;

    this.queries.push(op);
    this.sortedColumns.push(typeof fieldName === 'string' ? fieldName : fieldName.join(','));
    return this;
  }

  // ── Grouping ──────────────────────────────────────────────────────────────

  /**
   * Group rows by field.
   * applyQuery() collects the group specs; call groupBy() from collection.ts to execute them.
   *
   * @example
   * const q = new DataQuery()
   *   .where('active', 'equal', true)
   *   .group('category');
   *
   * const { result } = applyQuery(products, q);
   * const grouped = groupBy(result, 'category');
   */
  group(
    fieldName: string,
    comparer?: (a: unknown, b: unknown) => number,
    format?:   (val: unknown, field: string) => unknown,
  ): this {
    this.sortBy(fieldName, null, true);
    this.queries.push({
      fn: 'onGroup',
      e:  { fieldName, comparer: comparer ?? null, format: format ?? null },
    });
    this.groupedColumns.push(fieldName);
    return this;
  }

  // ── Pagination ───────────────────────────────────────────────────────────

  /**
   * Get a page of results (1-based index).
   *
   * @example .page(2, 25)  // second page, 25 per page
   */
  page(pageIndex: number, pageSize: number): this {
    this.queries.push({ fn: 'onPage', e: { pageIndex, pageSize } });
    return this;
  }

  /** Slice by absolute start/end index. */
  range(start: number, end: number): this {
    this.queries.push({ fn: 'onRange', e: { start, end } });
    return this;
  }

  /** Take the first N records. */
  take(nos: number): this {
    this.queries.push({ fn: 'onTake', e: { nos } });
    return this;
  }

  /** Skip the first N records. */
  skip(nos: number): this {
    this.queries.push({ fn: 'onSkip', e: { nos } });
    return this;
  }

  // ── Projection ───────────────────────────────────────────────────────────

  /**
   * Project specific fields from each record (supports dot-paths).
   *
   * @example .select(['id', 'name', 'address.city'])
   */
  select(fieldNames: string | string[]): this {
    const fields = typeof fieldNames === 'string' ? [fieldNames] : [...fieldNames];
    this.queries.push({ fn: 'onSelect', e: { fieldNames: fields } });
    return this;
  }

  // ── Aggregates ───────────────────────────────────────────────────────────

  /**
   * Declare an aggregate to compute.
   *
   * @param type  'sum' | 'average' | 'min' | 'max' | 'count' | 'truecount' | 'falsecount'
   *
   * @example
   * .aggregate('sum', 'amount')
   * .aggregate('count', 'id')
   */
  aggregate(type: string, field: string): this {
    this.queries.push({ fn: 'onAggregates', e: { field, type } });
    return this;
  }

  // ── Expand / distinct / params ────────────────────────────────────────────

  expand(tables: string | (string | Record<string, unknown>)[]): this {
    this.expands = typeof tables === 'string' ? [tables] : [...tables];
    return this;
  }

  distinct(fields: string | string[]): this {
    this.distincts = typeof fields === 'string' ? [fields] : [...fields];
    return this;
  }

  addParams(key: string, value: string | (() => string)): this {
    if (typeof value === 'function') {
      this.params.push({ key, fn: value });
    } else {
      this.params.push({ key, value });
    }
    return this;
  }

  // ── Clone ────────────────────────────────────────────────────────────────

  clone(): DataQuery {
    const q           = new DataQuery();
    q.queries         = [...this.queries];
    q.key             = this.key;
    q.fKey            = this.fKey;
    if (this.fromTable !== undefined) q.fromTable = this.fromTable;
    q.params          = [...this.params];
    q.expands         = [...this.expands];
    q.sortedColumns   = [...this.sortedColumns];
    q.groupedColumns  = [...this.groupedColumns];
    q.distincts       = [...this.distincts];
    if (this.subQuery !== undefined) q.subQuery = this.subQuery;
    q.isCountRequired = this.isCountRequired;
    return q;
  }

  // ── Static helpers ────────────────────────────────────────────────────────

  static filterQueries(queries: QueryOp[], name: string): QueryOp[] {
    return queries.filter(q => q.fn === name);
  }

  static filterQueryLists(
    queries: QueryOp[],
    singles: string[],
  ): Record<string, QueryOp['e']> {
    const res: Record<string, QueryOp['e']> = {};
    for (const q of queries) {
      if (singles.includes(q.fn) && !(q.fn in res)) {
        res[q.fn] = q.e;
      }
    }
    return res;
  }
}
