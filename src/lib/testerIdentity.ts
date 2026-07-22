const ACCOUNT_ID_KEY = "news-briefing-account-id";
const DEVICE_ID_KEY = "news-briefing-device-id";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function setClientCookie(name: string, value: string, maxAge: number) {
  if (typeof document === "undefined") return;

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax; max-age=${maxAge}${secure}`;
}

export function getOrCreateDeviceId() {
  if (typeof window === "undefined") return "";

  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    setClientCookie("newsbriefing_device_id", existing, COOKIE_MAX_AGE_SECONDS);
    return existing;
  }

  const newId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  window.localStorage.setItem(DEVICE_ID_KEY, newId);
  setClientCookie("newsbriefing_device_id", newId, COOKIE_MAX_AGE_SECONDS);

  return newId;
}

export function setCurrentTesterAccountId(accountId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCOUNT_ID_KEY, accountId);
  setClientCookie("newsbriefing_account_id", accountId, COOKIE_MAX_AGE_SECONDS);
}

export function getCurrentTesterAccountId() {
  if (typeof window === "undefined") return "";

  const value = window.localStorage.getItem(ACCOUNT_ID_KEY) ?? "";
  if (value) {
    setClientCookie("newsbriefing_account_id", value, COOKIE_MAX_AGE_SECONDS);
  }

  return value;
}

export function clearCurrentTesterAccountId() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCOUNT_ID_KEY);
  setClientCookie("newsbriefing_account_id", "", 0);
}

export async function sha256(value: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
