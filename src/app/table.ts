export type Compat = "ok" | "stretch" | "conflict";

/** Shared constraint-table lookup. Three lines, same grammar: col × row → 合/勉/冲. */
export function lookup<R extends string, C extends string>(
  grid: Record<C, Record<R, Compat>>,
  col: C,
  row: R,
): Compat {
  return grid[col][row];
}

/** Preferred row for a column when lookup is conflict. */
export function fallbackRow<R extends string, C extends string>(preferred: Record<C, R>, col: C): R {
  return preferred[col];
}
