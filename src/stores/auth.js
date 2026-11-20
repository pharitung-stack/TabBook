// Adapted from fullstackauth/vue-product-pinia/src/stores/auth.js.
// The session now lives in an HttpOnly cookie rather than browser storage.
import { defineStore } from 'pinia';
import { ref } from 'vue';

export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new Error('We couldn’t reach TabBook. Please try again in a moment.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const checked = ref(false);
  async function restoreSession() {
    try { user.value = (await api('/auth/me')).user; }
    catch { user.value = null; }
    finally { checked.value = true; }
  }
  async function authenticate(mode, values) {
    const data = await api(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(values) });
    user.value = data.user;
    checked.value = true;
  }
  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    user.value = null;
  }
  return { user, checked, restoreSession, authenticate, logout };
});
