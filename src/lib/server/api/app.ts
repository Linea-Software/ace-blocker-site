import { Hono } from 'hono';
import { v1Router } from './routers/v1';

export const app = new Hono().route('/v1', v1Router);

export type AppType = typeof app;
