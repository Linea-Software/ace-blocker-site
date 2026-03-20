import 'dotenv/config';
import { Resend } from 'resend';
import * as m from '$lib/paraglide/messages.js';

const env = process.env;

if (!env.RESEND_API_KEY) {
	throw new Error('RESEND_API_KEY is not set');
}

export const resend = new Resend(env.RESEND_API_KEY);

export function getTwoFactorEmailHtml(otpCode: string): string {
	return `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0B0F19; color: #E2E8F0; padding: 40px 20px; text-align: center;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #111827; border: 1px solid #1F2937; border-radius: 12px; padding: 40px 32px;">
            <div style="margin-bottom: 24px;">
                <h1 style="color: #F8FAFC; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.025em;">${m.email_app_name()}</h1>
                <p style="color: #94A3B8; font-size: 14px; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.05em;">${m.email_2fa_title()}</p>
            </div>
            
            <p style="font-size: 16px; line-height: 24px; color: #CBD5E1; margin-bottom: 32px;">
                ${m.email_2fa_body()}
            </p>

            <div style="background-color: #0B0F19; border: 1px solid #334155; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
                <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 36px; font-weight: 700; color: #F8FAFC; letter-spacing: 0.2em;">
                    ${otpCode}
                </span>
            </div>

            <p style="font-size: 12px; color: #64748B; margin: 0;">
                ${m.email_2fa_footer()}
            </p>
        </div>
    </div>
    `;
}

/**
 * Generates a strict, dark-themed Account Verification email.
 */
export function getVerificationEmailHtml(verifyUrl: string): string {
	return `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0B0F19; color: #E2E8F0; padding: 40px 20px; text-align: center;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #111827; border: 1px solid #1F2937; border-radius: 12px; padding: 40px 32px;">
            <div style="margin-bottom: 24px;">
                <h1 style="color: #F8FAFC; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.025em;">${m.email_app_name()}</h1>
                <p style="color: #94A3B8; font-size: 14px; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.05em;">${m.email_verification_title()}</p>
            </div>
            
            <p style="font-size: 16px; line-height: 24px; color: #CBD5E1; margin-bottom: 32px;">
                ${m.email_verification_body()}
            </p>

            <a href="${verifyUrl}" style="display: inline-block; background-color: #D97706; color: #FFFFFF; font-weight: 600; font-size: 16px; text-decoration: none; padding: 14px 32px; border-radius: 8px; margin-bottom: 32px;">
                ${m.email_verification_button()}
            </a>

            <p style="font-size: 12px; color: #64748B; margin: 0;">
                ${m.email_verification_footer()}
            </p>
        </div>
    </div>
    `;
}