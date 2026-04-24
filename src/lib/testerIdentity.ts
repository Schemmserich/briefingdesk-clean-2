const ACCOUNT_ID_KEY = "news-briefing-account-id";
const DEVICE_ID_KEY = "news-briefing-device-id";

export function getOrCreateDeviceId() {
  if (typeof window === "undefined") return "";

  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    document.cookie = `newsbriefing_device_id=${existing}; path=/; SameSite=Lax`;
    return existing;
  }

  const newId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  window.localStorage.setItem(DEVICE_ID_KEY, newId);
  document.cookie = `newsbriefing_device_id=${newId}; path=/; SameSite=Lax`;

  return newId;
}

export function setCurrentTesterAccountId(accountId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCOUNT_ID_KEY, accountId);
  document.cookie = `newsbriefing_account_id=${accountId}; path=/; SameSite=Lax`;
}

export function getCurrentTesterAccountId() {
  if (typeof window === "undefined") return "";
  const value = window.localStorage.getItem(ACCOUNT_ID_KEY) ?? "";
  if (value) {
    document.cookie = `newsbriefing_account_id=${value}; path=/; SameSite=Lax`;
  }
  return value;
}

export function clearCurrentTesterAccountId() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCOUNT_ID_KEY);
  document.cookie = "newsbriefing_account_id=; path=/; SameSite=Lax; max-age=0";
}

export async function sha256(value: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}