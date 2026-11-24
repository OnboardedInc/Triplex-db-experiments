// [DX-CON1] Per-browser conveniences: the position before my last change (a basis preset) and saved questions.
// Nothing here is state the store depends on.
const KEY_LAST = "triplex-console:before-last-change";

export function rememberCommit(position: number) {
  try {
    sessionStorage.setItem(KEY_LAST, String(position - 1));
  } catch {
    /* private mode */
  }
}
export function beforeLastChange(): number | null {
  try {
    const v = sessionStorage.getItem(KEY_LAST);
    return v && /^\d+$/.test(v) ? Number(v) : null;
  } catch {
    return null;
  }
}

export function loadLocal<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function saveLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode */
  }
}
