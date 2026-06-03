import 'dotenv/config';
import { Resend } from 'resend';
import * as m from './messages';
import type { Locale } from './messages';
import { RESEND_API_KEY } from '$env/static/private';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const resend = new Resend(RESEND_API_KEY);

// Inline logo images as base64 data URIs so they always render immediately in
// email clients — no external image blocking, no "Show images" prompt needed.
const __dirname = dirname(fileURLToPath(import.meta.url));

function readLogoBase64(filename: string): string {
	const path = resolve(__dirname, '../assets/logo/PNG', filename);
	const buffer = readFileSync(path);
	return `data:image/png;base64,${buffer.toString('base64')}`;
}

const DARK_LOGO_DATA_URI = readLogoBase64('dark-full-logo.png');
const LIGHT_LOGO_DATA_URI = readLogoBase64('light-full-logo.png');

// Shared <head> for both templates.
// Dark mode is the inline-style default (fallback for clients that strip <style>).
// Light mode overrides are applied via @media (prefers-color-scheme: light) with !important.
// Apple Mail also requires the supported-color-schemes meta tag.
const emailHead = `<head>
<meta charset="UTF-8">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<style>
  @media (prefers-color-scheme: light) {
    .email-body     { background-color: #F8FAFC !important; }
    .email-card     { background-color: #FFFFFF !important; border-color: #E2E8F0 !important; }
    .email-heading  { color: #0F172A !important; }
    .email-text     { color: #475569 !important; }
    .email-otp-box  { background-color: #F1F5F9 !important; border-color: #CBD5E1 !important; }
    .email-otp-code { color: #0F172A !important; }
    .email-divider  { border-top-color: #E2E8F0 !important; }
    .email-footer   { color: #94A3B8 !important; }
    .email-logo-dark  { display: none !important; }
    .email-logo-light { display: block !important; }
  }
</style>
</head>`;

function logoHtml(): string {
	return `
                    <!-- Dark mode default -->
                    <img class="email-logo-dark"
                         src="${DARK_LOGO_DATA_URI}"
                         alt="Ace Blocker"
                         width="180"
                         height="42"
                         style="display:block; margin:0 auto; width:180px; height:auto; border:0;" />
                    <!-- Light mode override -->
                    <img class="email-logo-light"
                         src="${LIGHT_LOGO_DATA_URI}"
                         alt="Ace Blocker"
                         width="180"
                         height="42"
                         style="display:none; margin:0 auto; width:180px; height:auto; border:0;" />`;
}

export function getTwoFactorEmailHtml(otpCode: string, locale: Locale = 'en'): string {
	return `<!DOCTYPE html>
<html lang="${locale}">
${emailHead}
<body style="margin:0;padding:0;">
    <div class="email-body" style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0B0F19; color: #E2E8F0; padding: 60px 20px; text-align: center; line-height: 1.5;">
        <div class="email-card" style="max-width: 480px; margin: 0 auto; background-color: #111827; border: 1px solid #1F2937; border-radius: 16px; overflow: hidden;">
            <div style="height: 4px; background-color: #D97706; width: 100%;"></div>

            <div style="padding: 40px 32px;">
                <div style="margin-bottom: 32px;">${logoHtml()}
                </div>

                <p class="email-text" style="font-size: 16px; line-height: 26px; color: #CBD5E1; margin-bottom: 32px; font-weight: 400;">
                    ${m.email_2fa_body(locale)}
                </p>

                <div class="email-otp-box" style="background-color: #0B0F19; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                    <span class="email-otp-code" style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 38px; font-weight: 700; color: #F8FAFC; letter-spacing: 0.25em;">
                        ${otpCode}
                    </span>
                </div>

                <hr class="email-divider" style="border: none; border-top: 1px solid #1F2937; margin: 0 0 24px 0;" />

                <p class="email-footer" style="font-size: 13px; line-height: 20px; color: #64748B; margin: 0;">
                    ${m.email_2fa_footer(locale)}
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

export function getVerificationEmailHtml(verifyUrl: string, locale: Locale = 'en'): string {
	return `<!DOCTYPE html>
<html lang="${locale}">
${emailHead}
<body style="margin:0;padding:0;">
    <div class="email-body" style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0B0F19; color: #E2E8F0; padding: 60px 20px; text-align: center; line-height: 1.5;">
        <div class="email-card" style="max-width: 480px; margin: 0 auto; background-color: #111827; border: 1px solid #1F2937; border-radius: 16px; overflow: hidden;">
            <div style="height: 4px; background-color: #D97706; width: 100%;"></div>

            <div style="padding: 40px 32px;">
                <div style="margin-bottom: 32px;">${logoHtml()}
                </div>

                <p class="email-text" style="font-size: 16px; line-height: 26px; color: #CBD5E1; margin-bottom: 36px; font-weight: 400;">
                    ${m.email_verification_body(locale)}
                </p>

                <div style="margin-bottom: 36px;">
                    <a href="${verifyUrl}" style="display: inline-block; background-color: #D97706; color: #FFFFFF; font-weight: 600; font-size: 16px; text-decoration: none; padding: 16px 36px; border-radius: 10px;">
                        ${m.email_verification_button(locale)}
                    </a>
                </div>

                <hr class="email-divider" style="border: none; border-top: 1px solid #1F2937; margin: 0 0 24px 0;" />

                <p class="email-footer" style="font-size: 13px; line-height: 20px; color: #64748B; margin: 0;">
                    ${m.email_verification_footer(locale)}
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
}
