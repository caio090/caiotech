const LAST_SEEN_KEY = "lokat_notif_last_seen_count";

/** Returns the pending count that was current when the user last opened the bell */
export function getSeenCount(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(LAST_SEEN_KEY) ?? "0", 10);
}

/** Save current pending count as "seen" — called when user opens the dropdown */
export function markNotifSeen(currentCount: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_SEEN_KEY, String(currentCount));
}

/**
 * Returns true if there are new pending approvals the user hasn't opened the bell for yet.
 * Red dot on bell = unseen. Sidebar badge = still-pending count. These are independent.
 */
export function hasUnreadNotif(pendingCount: number): boolean {
  if (typeof window === "undefined") return false;
  return pendingCount > getSeenCount();
}
