import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set');
}

export const resend = new Resend(env.RESEND_API_KEY);