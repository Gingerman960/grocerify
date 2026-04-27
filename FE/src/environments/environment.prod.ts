/**
 * Production environment.
 * Replace `apiBaseUrl` with the deployed API origin (or `/api` if same-host).
 */
export const environment = {
  production: true,
  apiBaseUrl: 'http://localhost:3001',
} as const;
