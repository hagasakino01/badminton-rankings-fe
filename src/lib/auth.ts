import { API_URL } from "./config";
import type { User } from "@/types/api";

const STORAGE_KEY = "badminton-rankings-session";
const SESSION_EVENT = "badminton-rankings-session-change";
let cachedRawSession: string | null | undefined;
let cachedSession: AuthSession | null = null;

export type AuthSession = {
  user: User;
};

function notifySessionChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function readSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  if (rawValue === cachedRawSession) {
    return cachedSession;
  }

  cachedRawSession = rawValue;

  if (!rawValue) {
    cachedSession = null;
    return null;
  }

  try {
    cachedSession = JSON.parse(rawValue) as AuthSession;
    return cachedSession;
  } catch {
    cachedSession = null;
    return null;
  }
}

export function persistSession(session: AuthSession) {
  const rawValue = JSON.stringify(session);
  window.localStorage.setItem(STORAGE_KEY, rawValue);
  cachedRawSession = rawValue;
  cachedSession = session;
  notifySessionChanged();
}

export function clearSession() {
  window.localStorage.removeItem(STORAGE_KEY);
  cachedRawSession = null;
  cachedSession = null;
  notifySessionChanged();
}

export function updateSessionUser(user: User) {
  const currentSession = readSession();
  if (!currentSession) {
    return;
  }

  persistSession({
    user,
  });
}

export async function logoutSession() {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    // Clear client state even if the backend cookie has already expired.
  } finally {
    clearSession();
  }
}

export function subscribeSessionChange(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(SESSION_EVENT, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(SESSION_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
