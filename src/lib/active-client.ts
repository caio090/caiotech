export const ACTIVE_CLIENT_KEY      = "lokat_active_client_id";
export const ACTIVE_CLIENT_NAME_KEY = "lokat_active_client_name";

export function setActiveClient(id: string, name: string): void {
  localStorage.setItem(ACTIVE_CLIENT_KEY, id);
  localStorage.setItem(ACTIVE_CLIENT_NAME_KEY, name);
}

export function clearActiveClient(): void {
  localStorage.removeItem(ACTIVE_CLIENT_KEY);
  localStorage.removeItem(ACTIVE_CLIENT_NAME_KEY);
}
