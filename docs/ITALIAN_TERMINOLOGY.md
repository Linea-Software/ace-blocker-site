# Italian Localization: Terminology and Editorial Review

Reviewed November 6, 2026. Locale: Italian (Italy). Compared EN and IT in two passes: accuracy and writing quality. This is not legal advice or independent human approval.

| English concept | Preferred Italian form | Meaning and use |
| --- | --- | --- |
| Network Block                 | **blocco di rete**                                                                  | Configuration that links sites and categories to enforcement periods. Use «Blocco» only when the context is clear. |
| Lock / time-lock              | **protezione delle regole**, **protezione delle modifiche**, **protezione a tempo** | Prevents changes that weaken active rules. It does not add sites or extend filtering times. Action: «Proteggi». State: «Modifiche bloccate». |
| Schedule                      | **programmazione**, **orari programmati**                                           | Days and times when a Network Block enforces its rules. Without configured times, the filter does not apply. |
| Resistance Mode               | **modalità Resistenza**; **Resistenza** nella navigazione                           | Pro feature that changes feeds, videos, UI, and delays on supported sites. It does not mean a Network Block. |
| Categories                    | **categorie predefinite**, **categorie**                                            | Curated lists offered by Ace. Some are Free; the full catalog is Pro. «Selezionate» describes editorial selection. |
| Custom Lists                  | **liste personalizzate**                                                            | Imported domain lists. This is a Pro feature. |
| Downloaded vs enabled         | **scaricata** vs **collegata al blocco**                                            | Downloading makes list data available. To enforce it, attach the list to a Network Block with an active schedule. |
| Free / Pro                    | **Free**, **Pro**                                                                   | Keep plan names unchanged. Free includes basic blocking. Pro adds Resistance, all categories, Custom Lists, and cloud backup. |
| Recurring payment             | **pagamento ricorrente**                                                            | Do not use «prezzo ricorrente». Distinguish charges, renewals, prices, and cancellation. |
| Authenticated product release | **versione verificata**                                                             | A verified release is not necessarily installable. Avoid «release autenticate». |
| Settings                      | **Impostazioni**                                                                    | Use the same name in navigation, section headings, tooltips, and instructions. |
| Private by Design             | **Privacy fin dalla progettazione**                                                 | Privacy is part of product design, not an optional user preference. |

## Dynamic Plurals

For counters, provide complete phrases for **zero, one, and more than one**.
Use `countMessage` or explicit branches for trial-day messages.
Keep these translation examples unchanged: «Nessun blocco», «1 blocco», «2 blocchi»; «Nessuna visita», «1 visita», «2 visite».
Do not invent plural forms for unchanged terms such as «record» and «account».
Keep original keys and placeholders. Add keys only for required variants.

## Checks Before Publication

- **Independent legal review:** Review claims about Pro usage data, optional error reports, backup, encryption, third parties, retention, consent to changes, liability, and access suspension. Translation must not change the English legal terms.
- **English source issues:** `faq_a1` and `home_what_is_description` can imply that locks keep filtering active outside scheduled periods.
  In the app, `category_apply_note` describes a list as blocked instead of the sites it contains.
  `onboarding_resistance_toggle_hint` says intensity can change at any time, even with a lock.
  `onboarding_welcome_body` does not explain that Resistance requires Pro.
  `tour_blocked_attempts_body` says “sites blocked”, but the metric counts attempts.
  Review English source messages separately. Do not silently change their meaning in Italian.
- **Claims to confirm:** Review the FAQ, privacy policy, supported platforms, setup time (“less than one minute”), categories, and updates.
  An editorial review does not replace legal or commercial verification.

## Verification

The Italian catalog has been compared with the complete English catalog.
Preserve URLs, keys, parameters, and commercial references in every change.
Run Paraglide compilation, checks, tests, and visual reviews on actual screens.
Do not revise correct phrases only because of a style preference.
