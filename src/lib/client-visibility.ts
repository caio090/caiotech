// "ativo" is the Portuguese form stored by older DB rows (pre-SQL-54 migration path).
// "active" is the normalised English form used by the app layer.
// Both are visible; the API normalises "ativo" → "active" on read.
export const CLIENT_VISIBLE_STATUSES = ["active", "onboarding", "ativo"];

export const CLIENT_INVISIBLE_STATUSES = [
  "inactive",
  "archived",
  "deleted",
  "cancelled",
  "canceled",
  "test",
];

export function isClientVisible(status: string | null | undefined) {
  return CLIENT_VISIBLE_STATUSES.includes(status ?? "");
}

export function isVisibleClientRecord(client: {
  status?: string | null;
  deleted_at?: string | null;
  archived_at?: string | null;
  is_test?: boolean | null;
}) {
  return (
    isClientVisible(client.status) &&
    !client.deleted_at &&
    !client.archived_at &&
    client.is_test !== true
  );
}

export function isMissingClientVisibilityColumn(error: { code?: string; message?: string } | null) {
  const text = error?.message?.toLowerCase() ?? "";
  return error?.code === "PGRST204" || text.includes("could not find") || text.includes("column");
}
