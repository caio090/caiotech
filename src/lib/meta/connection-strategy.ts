/**
 * Pure specification of "is this OAuth callback the same Meta connection as
 * an existing row, or a genuinely new one" — mirrors the WHERE clause built
 * in src/app/api/meta/callback/route.ts (connected_by + provider +
 * meta_user_id). Kept here, independently testable, so the matching rule
 * has one written-down definition instead of only living inside a Supabase
 * query chain nothing can unit-test without a live database.
 *
 * The route itself still filters server-side via real .eq()/.is() calls
 * (correct for a table that can hold many users' connections — pulling
 * every row into memory to filter in JS would not scale). This function is
 * the spec those calls are meant to implement;
 * src/app/api/meta/callback/__tests__/connection-strategy.test.ts checks
 * both this pure rule AND (structurally, by reading route.ts's source) that
 * the real query filters on the same three fields.
 */
export interface StoredMetaConnection {
  id: string;
  connected_by: string;
  provider: string;
  meta_user_id: string | null;
  scopes?: string | null;
  status?: string;
  is_active?: boolean;
}

export interface MetaConnectionCandidate {
  connected_by: string;
  provider: string;
  meta_user_id: string | null;
}

export function findExistingMetaConnection(
  rows: readonly StoredMetaConnection[],
  candidate: MetaConnectionCandidate,
): StoredMetaConnection | null {
  const match = rows.find((row) =>
    row.connected_by === candidate.connected_by &&
    row.provider === candidate.provider &&
    (candidate.meta_user_id ? row.meta_user_id === candidate.meta_user_id : row.meta_user_id === null),
  );
  return match ?? null;
}
