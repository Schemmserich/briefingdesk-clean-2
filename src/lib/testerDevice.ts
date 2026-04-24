const DEVICE_ID_KEY = "news-briefing-device-id";

export function getOrCreateDeviceId() {
  if (typeof window === "undefined") {
    return "";
  }

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