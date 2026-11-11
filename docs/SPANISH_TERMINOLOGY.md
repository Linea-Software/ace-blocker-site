# International Spanish Localization: Terms and Editorial Review

Date: November 6, 2026. Locale: `es` (Spain and Latin America). Main source: both products' `messages/en.json`.

This document records terms for Ace Blocker Desktop and Ace Blocker Site. GPT-6 assisted with Spanish translation and editorial review. This is **not certification by a native-speaking editor or legal expert**.

## Approved Translation Terms

| English concept | Preferred Spanish term | Meaning and use |
| --- | --- | --- |
| Network Block                       | **bloqueo de red**                                     | Sites, categories, and schedule. Rules apply only during configured times. |
| Block (nel contesto Network Blocks) | **bloqueo**                                            | Short form only when website filtering is clear from context. |
| Lock                                | **protección contra cambios**, **protección**          | Prevents deletion, deactivation, or weaker settings. Does not add blocked sites. |
| Hard / timed lock                   | **protección estricta**, **protección temporal**       | Cannot be removed until its period ends. |
| Schedule lock                       | **protección por horario**                             | Prevents changes during the configured period. |
| Reflection Lock                     | **protección con reflexión**                           | Requires a reflection question and a five-minute wait. |
| Locked (settings)                   | **cambios protegidos**                                 | Indicates protected settings, not active website filtering. |
| Schedule                            | **horario**, **horas programadas**                     | Weekly enforcement periods with saved time and time zone. |
| Resistance Mode                     | **Modo Resistencia**, **Resistencia**                  | Changes distracting website functions without necessarily blocking access. |
| Categories / Site Packs             | **categorías**, **categorías seleccionadas**           | Domain groups available for use, not automatically applied to a block. |
| Custom Lists                        | **listas personalizadas**                              | Reusable imported lists for Pro users. |
| Downloaded / attached / enabled     | **descargada** / **añadida al bloqueo** / **activado** | Distinguish downloaded data, attachment to a block, and active enforcement. |
| Blocking attempts                   | **intentos de acceso bloqueados**                      | Counts blocked attempts, not unique domains. |
| Safe Search                         | **Búsqueda segura**                                    | Filters explicit results in compatible search engines. |
| Free / Pro                          | **Free / Pro**                                         | Keep commercial plan names unchanged. |
| Engine                              | **motor**                                              | Local Ace Blocker engine. |
| Backup                              | **copia de seguridad**                                 | Saved file or copy of a configuration. |
| Cloud backup                        | **copia de seguridad en la nube**                      | Pro feature for saving and restoring account data. |
| Account                             | **cuenta**                                             | Personal user profile. |
| Subscription                        | **suscripción**                                        | Subscription to a plan. |
| Renewal / cancellation              | **renovación / cancelación**                           | Distinguish automatic renewal, payment cancellation, and end of access. |

## Writing Rules

- Use informal singular **tú**. Do not switch without reason to `usted` or `vos`.
- Use international Spanish. Prefer **equipo / dispositivo**, `sitio web`, `configuración`, and `correo electrónico` when regional terms differ.
- Use short imperative buttons: `Guardar`, `Eliminar`, `Descargar`, `Proteger`.
- Explain consequences and irreversible actions in confirmation text.
- Use `_zero`, `_one`, and plural message keys with `countMessage`. Test zero, one, and multiple items.
- Preserve brand names, URLs, placeholders, prices, trial duration, renewal terms, time zones, and third-party references.
- Use short labels in dense previews when needed: `Feeds laborales`, `Elegidos`, `Autom.`.

## Meaning and Readability Review

- `control_lock_help_detail` / `lock_explanation`: Protection does **not** block more sites or extend filtering outside scheduled times.
- `lock_preview_schedule`, `lock_preview_until`, `lock_support_note`: Keep change limits, expiration, and support limits accurate.
- `tour_blocked_attempts_body`: The counter measures blocked **attempts**, not the number of sites.
- `category_apply_note`: Downloading a category does not activate a block.
- Checkout messages distinguish the amount due today, recurring price, renewal, and cancellation.
- Site previews showed truncated Spanish labels. Shorten labels only when their meaning remains clear.

## Required Checks Before Commercial Publication

1. Obtain an independent legal review of Privacy and Terms.
   Review encryption, retention, deletion, data rights, Resistance usage data, third parties, liability, suspension, refunds, and governing law.
   Do not add regional clauses without approval.
2. Review ambiguous English messages: `faq_a1`, `home_what_is_description`, `onboarding_resistance_toggle_hint`, `category_apply_note`, and `onboarding_welcome_body`.
   Some can suggest that a lock extends filtering hours or that Resistance settings always remain editable.
   The welcome message does not clearly state that Resistance requires Pro.
   Review English source strings separately. Do not silently change them during Spanish translation.
3. Verify product claims about one-minute setup, platforms, a 14-day trial, Free and Pro features, categories, prices, currencies, and Dodo Payments terms.
4. Obtain an independent native-speaking editorial review.
   Test checkout and account pages with authentication.
   Test the native WebView and system locale on Windows, macOS, and Linux.
   Check responsive dialogs and dark mode.
   Development browser screenshots do not prove Tauri engine behavior.

## Technical Verification

At review time, `messages/es.json` matched 748/748 English Desktop keys and 818/818 Site keys.
Placeholders were unchanged. SvelteKit and Paraglide compiled.
Counter and locale selector tests were added or updated.
Local site URLs and SEO include `/es` in canonical, `hreflang`, and sitemap data for seven public pages.
The delivery report records the actual tests and their limitations.
