import { defineStore } from 'pinia';
import type { AuthenticatedUser } from '../domain/types';

export const useSessionStore = defineStore('session', {
  state: () => ({
    user: null as AuthenticatedUser | null,
  }),
  getters: {
    isAuthenticated: (state) => state.user !== null,
    isManager: (state) => state.user?.role === 'manager',
  },
  actions: {
    setUser(user: AuthenticatedUser) {
      this.user = user;
    },
    clear() {
      this.user = null;
    },
  },
});
