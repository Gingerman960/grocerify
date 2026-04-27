/**
 * Default (development) environment.
 * Replaced at build time by environment.prod.ts in production configuration.
 */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3001',
} as const;
