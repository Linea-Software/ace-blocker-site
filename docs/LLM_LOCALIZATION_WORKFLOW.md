# Ace Blocker: LLM Translation and Natural Localization

> Shared workflow for **Ace Blocker Site** and **Ace Blocker Desktop**.
> Reviewed November 6, 2026. The counts below are historical snapshots, not live test results.

## Purpose

Write text that reads naturally in the target language.
Keep the product behavior and security limits accurate.
Translate the user experience, not isolated words.
Do not add claims or change the meaning of locks, schedules, subscriptions, or data use.
English is the current source. Review unclear English text before translation.

## Verified Starting State (November 6, 2026)

| Repository | English source | Configured locales | Already translated keys |
| --- | --- | --- | --- |
| `ace-blocker/apps/ace-app` | 720 keys in `messages/en.json` | en, de, it, es, fr, pt, pt-BR | it: 13; others: 0 |
| `ace-blocker-site` | 724 keys in `messages/en.json` | en, es, it, de | es/it/de: 56 each |

These numbers count keys. They do **not** measure complete UI or page translations.
Both projects use Paraglide/inlang, but their `project.inlang/settings.json` files differ.
Do not change message formats or dependency versions only to translate strings.

## State After Initial Implementation (November 6, 2026)

The table above records the starting state.
After the EN/IT work, the desktop catalog had 731 keys per language.
The site catalog had 805 keys.
Privacy and Terms page bodies now use Paraglide.
The SEO gate exposes the completed Italian pages.
Other locales were not declared complete.
Passing technical checks is not equivalent to legal or native-speaking review.
Review lock, payment, privacy, Terms, and data claims before publication.

## Sources and Priority

1. **Product behavior:** Use current code, product content, and documents on Network Blocks, locks, schedules, Resistance, payments, and privacy.
   Report ambiguous or incorrect claims. Do not invent corrections.
2. **Terms and tone:** Use this guide and the approved glossary for each language. Keep glossaries current in pull requests.
3. **English messages:** Read each project's `messages/en.json` and other content that still needs localization.
4. **Technical skills:** Consult `.agents/skills/i18n-localization/SKILL.md` and
   `ace-blocker-site/.agents/skills/paraglide-js-internationalization-i18n/SKILL.md`.
   These guides cover technology, not the quality of the writing.
   Use the project's actual `import * as m` and `m.key()` patterns.
   Use Bun instead of generic npm examples.

## Ace Writing Style

- **Desktop app:** Use short, calm, direct text. State conditions, results, and actions without judgment.
- **Website:** Use more expressive headings, but keep every claim measurable and accurate.
- **Both:** Use natural, inclusive language and consistent terms.
  Avoid literal English patterns, unnecessary English loanwords, formal passive voice, invented superlatives, and marketing exclamation marks.
  Do not alternate synonyms for one technical concept.
- You can change sentence order and length when the meaning stays the same.
  Keep essential security explanations and constraints, even when UI space is limited.
## Proposed Glossary Before the First Translation Pass

| English concept | Meaning to preserve | Proposed Italian form to validate |
| --- | --- | --- |
| Network Block        | Configuration that filters sites or categories during a schedule. | `blocco di rete`                                                      |
| Lock / time-lock     | Protects block settings against changes that weaken rules. Does **not** block more sites. | `blocco delle modifiche` / `protezione delle regole` secondo contesto |
| Locked               | Prevents users from weakening a rule while its protection is active. | `modifiche bloccate` oppure `protetto`, secondo il controllo          |
| Schedule             | Times during which a Network Block enforces rules. | `programmazione` / `orari programmati`                                |
| Resistance Mode      | Tools that reduce distracting parts of supported sites. Not a Network Block. | `modalità Resistenza` (nome prodotto da convalidare)                  |
| Category / Site Pack | List of sites. Downloading it does **not** activate filtering. | `categoria` (distinguere da lista personalizzata)                     |
| Pro / Ace Blocker    | Commercial plan or product name. | lasciare invariato                                                    |

This glossary is a **proposal**, not an approved list.
Approve terms with examples from real screens.
Then use the same terms on the website, desktop, FAQ, and emails.
Do not translate both `Lock` and `Network Block` as generic `blocco` when this is ambiguous.
Choose Spain-specific or international Spanish before translation.
Keep Portuguese `pt` and Brazilian Portuguese `pt-BR` separate.

## Procedure for Each Language or Feature

1. **Select a complete user experience.** Group 20–50 related keys from one screen or workflow.
   Examples include Network Block creation, scheduling, locks, checkout, and FAQ.
   For each key, include the English text, key, screen, control type, purpose, available space, variables, and available screenshot.
   Exclude approved keys unless their English source changed.
2. **Define the brief.** Specify locale, regional variant, audience, tone, approved terms, untranslated terms, and product rules.
   Include 3–5 examples of approved natural writing in the target language.
3. **Translate with the LLM.** Request one JSON object with exactly the selected keys and natural target-language values.
   Permit clear reformulation. Do not omit information, add claims, or change product behavior.
   Record source ambiguity separately. Do not invent an answer.
4. **Use an independent review pass.** In a separate call, compare English, UI context, and the draft.
   Prefer a reviewer that does not see the translator's reasoning.
   Check literal patterns, false friends, reversed meaning, terminology, brand tone, and security limits.
   Return only justified changes and a `needs_review` list. Do not rewrite correct text for personal preference.
5. **Get focused human review.** Ask a competent native speaker to approve important screens.
   Review locks, anti-tampering, schedules, irreversible actions, privacy, legal terms, prices, trials, renewals, cancellation, and security.
   An LLM cannot replace legal review or verification of commercial claims.
6. **Run automatic and visual checks.** Validate JSON, keys, placeholders, formats, and Paraglide compilation.
   Check screenshots at narrow widths and desktop sizes, in light and dark modes.
   Check truncation, plurals, and text with real data. Do not depend only on back-translation.
7. **Publish complete pages or flows.** Do not index a page as localized while its main body remains English.
   Record the terms, prompt, model version, date, reviewer, QA result, and unresolved strings.

## Mandatory Automatic Constraints

- Keep exactly the input keys, JSON structure, and string values.
  Do not put comments, Markdown, or extra keys into localized JSON.
- Preserve all placeholders and syntax: `{days}`, `{count}`, `{version}`, `{name}`.
  Also preserve brand names, technical names, markup, URLs, identifiers, and escape sequences.
- Do not join translated strings in a way that forces English word order.
  Check the installed message format before adding plural forms.
  Do not invent unsupported ICU syntax.
- Allow internal English fallback, but do not claim full translation when required content remains English.
  Flag untranslated or nearly identical strings for review. Do not flag brand names as translation errors.
- Check spelling, punctuation, dates, numbers, button width, screen-reader output, and RTL where required.
- Do not send secrets, credentials, personal data, or unnecessary private text to translation prompts.
## Practical Example: Preserve the Meaning

EN (`control_lock_help_detail`, app):

> A lock does not block more websites. It protects your chosen rules from being turned off or weakened impulsively.

Proposed natural Italian text:

> Bloccare le modifiche non aggiunge siti al filtro: impedisce di disattivare o indebolire d'impulso le regole che hai scelto.

A literal translation such as “il blocco blocca...” would be unclear.
The Italian text is **only a proposal**. Compare it with the source text, the UI control, and the final approved glossary before use.

## Reusable Base Prompt (Adapt to the Locale and Workflow)

> Act as a native-language localization specialist and UX writer for Ace Blocker. Do not translate word for word. Translate the attached JSON segments from English into **[target locale]** for **[app/site and page]**. Audience: **[audience]**. Screen goal: **[action]**. Use precise, brief, natural language. Keep the desktop app calm. Make the website more expressive, but keep its claims verifiable. Follow **[approved glossary]** and the 3–5 examples in **[examples]**. Do not change keys, placeholders, tags, URLs, or facts. Avoid literal English patterns, bureaucratic passive voice, needless jargon, and new promises. If the English source is ambiguous, do not guess. List the key in a separate report. Return **only one valid JSON object** with exactly the supplied keys. Provide review notes in a separate output only when requested.

Second-pass prompt:

> Act as an independent editorial reviewer. Compare the English source, translation into **[locale]**, UI context, glossary, and product limits. Report only these problems: (1) changed or missing meaning, (2) unnatural phrasing, (3) inconsistent terms, (4) incorrect placeholders or formats, and (5) text that is hard to read in context. For each problem, provide the key, severity, corrected text, and a brief explanation. Do not change text that is already natural. Mark `needs_review` when a product decision is necessary.

## Checks by Repository

**Desktop app — `ace-blocker/apps/ace-app`**

- English source: `messages/en.json`. Targets: `messages/{locale}.json`. The configuration supports en, de, it, es, fr, pt, and pt-BR. Only en and it are complete. The in-app control displays Sistema/English/Italiano.
- In the app directory, run `bun run i18n:audit` to verify the integrity of _referenced English keys_, not target-language coverage. Run `bun run check`. If you change views or formats, run the relevant tests and check screenshots.
- Review the difference between Network Block and Lock. Distinguish enforced rules from downloaded lists. Check schedules, dates, times, local attempt counts, anti-tampering limits, update states, and irreversible actions.
- Read the app's `docs/ui-identity.md`. Put clarity before brand personality.

**Website — `ace-blocker-site`**

- English source: `messages/en.json`. Targets: `messages/{locale}.json`. In code, use `m.chiave()` and language-preserving links with `localizeHref`.
- In the website directory, run `bun run check` and relevant tests. For SEO, inspect `src/lib/seo.ts`. Its `localesForPath` exposes EN/ES/IT/DE only for `/faq`, and EN/IT for other public pages. Do not declare ES/DE complete on other pages until you translate **all** useful content and metadata. Then run `bun run seo:audit` in an available environment.
- The FAQ uses the same messages for visible text and JSON-LD. Keep them consistent. Privacy and Terms now use Paraglide keys in their component bodies. Obtain legal review and verify privacy claims before publication.
- Require human review of checkout, free trials, amounts, renewals, cancellation, data-processing policies, and product claims. Use the same glossary for the website and app. Their writing styles can differ.

## Acceptance Criteria and Maintenance

Before you declare a language or page complete, meet all these conditions:

- Report **zero JSON, key, or placeholder errors**.
- Pass the technical checks.
- Resolve **all critical ambiguities**.
- Obtain native-speaker review of representative screens and high-risk text.
- Remove truncation that changes the meaning.
- Do not present an SEO route as fully translated if it still has untranslated required content.

Run a differential review each time `en.json` changes.
Reopen only the affected segments.

**Future improvement:** Add a small Ace-specific _localization editorial QA_ skill.
Have it read this guide, the approved glossary, and examples before it generates strings.
Keep existing general skills as technical references, not as writing-style prompts.
