/**
 * Server-only environment utilities.
 *
 * Uses `process.env.NODE_ENV` because it is reliably set by Vite during
 * `vite build` ("production") and at runtime via the .env / system environment.
 */
export const isProduction = process.env.NODE_ENV === 'production';
export const isDev = !isProduction;
