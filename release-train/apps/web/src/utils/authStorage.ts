import type { SafeUser } from '@release-train/shared';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export interface StoredAuthState {
  token: string | null;
  user: SafeUser | null;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function loadStoredAuth(): StoredAuthState {
  const token = localStorage.getItem(TOKEN_KEY);
  const userStr = localStorage.getItem(USER_KEY);

  try {
    return {
      token,
      user: userStr ? (JSON.parse(userStr) as SafeUser) : null,
    };
  } catch {
    localStorage.removeItem(USER_KEY);
    return { token, user: null };
  }
}

export function saveAuth(token: string, user: SafeUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function saveUser(user: SafeUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
