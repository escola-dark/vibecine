const SESSION_KEYS = {
  lastRoute: 'vibestream_last_route',
  rememberMe: 'vibestream_remember_choice',
} as const;

export function saveLastRoute(route: string) {
  const safeRoute = route?.trim() || '/';
  localStorage.setItem(SESSION_KEYS.lastRoute, safeRoute);
}

export function getLastRoute() {
  return localStorage.getItem(SESSION_KEYS.lastRoute) || '/';
}

export function setRememberChoice(rememberMe: boolean) {
  localStorage.setItem(SESSION_KEYS.rememberMe, String(rememberMe));
}

export function hasRememberChoice() {
  return localStorage.getItem(SESSION_KEYS.rememberMe) === 'true';
}