import 'dotenv/config';
import { Resend } from 'resend';
import * as m from './messages';

const env = process.env;

if (!env.RESEND_API_KEY) {
	throw new Error('RESEND_API_KEY is not set');
}

export const resend = new Resend(env.RESEND_API_KEY);

export function getTwoFactorEmailHtml(otpCode: string): string {
	return `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0B0F19; color: #E2E8F0; padding: 60px 20px; text-align: center; line-height: 1.5;">
        <div style="max-width: 480px; margin: 0 auto; background-color: #111827; border: 1px solid #1F2937; border-radius: 16px; overflow: hidden;">
            <div style="height: 4px; background-color: #D97706; width: 100%;"></div>

            <div style="padding: 40px 32px;">
                <div style="margin-bottom: 32px;">
                    <h1 style="color: #F8FAFC; font-size: 26px; font-weight: 700; margin: 0; letter-spacing: -0.025em;">${m.email_app_name()}</h1>
                </div>

                <p style="font-size: 16px; line-height: 26px; color: #CBD5E1; margin-bottom: 32px; font-weight: 400;">
                    ${m.email_2fa_body()}
                </p>

                <div style="background-color: #0B0F19; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                    <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 38px; font-weight: 700; color: #F8FAFC; letter-spacing: 0.25em;">
                        ${otpCode}
                    </span>
                </div>

                <hr style="border: none; border-top: 1px solid #1F2937; margin: 0 0 24px 0;" />

                <p style="font-size: 13px; line-height: 20px; color: #64748B; margin: 0;">
                    ${m.email_2fa_footer()}
                </p>
            </div>
        </div>
    </div>
    `;
}

export function getVerificationEmailHtml(verifyUrl: string): string {
	return `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0B0F19; color: #E2E8F0; padding: 60px 20px; text-align: center; line-height: 1.5;">
        <div style="max-width: 480px; margin: 0 auto; background-color: #111827; border: 1px solid #1F2937; border-radius: 16px; overflow: hidden;">
            <div style="height: 4px; background-color: #D97706; width: 100%;"></div>

            <div style="padding: 40px 32px;">
                <div style="margin-bottom: 32px;">
                    <h1 style="color: #F8FAFC; font-size: 26px; font-weight: 700; margin: 0; letter-spacing: -0.025em;">${m.email_app_name()}</h1>
                </div>

                <p style="font-size: 16px; line-height: 26px; color: #CBD5E1; margin-bottom: 36px; font-weight: 400;">
                    ${m.email_verification_body()}
                </p>

                <div style="margin-bottom: 36px;">
                    <a href="${verifyUrl}" style="display: inline-block; background-color: #D97706; color: #FFFFFF; font-weight: 600; font-size: 16px; text-decoration: none; padding: 16px 36px; border-radius: 10px;">
                        ${m.email_verification_button()}
                    </a>
                </div>

                <hr style="border: none; border-top: 1px solid #1F2937; margin: 0 0 24px 0;" />

                <p style="font-size: 13px; line-height: 20px; color: #64748B; margin: 0;">
                    ${m.email_verification_footer()}
                </p>
            </div>
        </div>
    </div>
    `;
}
