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
## Esempio concreto: fedeltà del significato

EN (`control_lock_help_detail`, app):

> A lock does not block more websites. It protects your chosen rules from being turned off or weakened impulsively.

IT candidata naturale:

> Bloccare le modifiche non aggiunge siti al filtro: impedisce di disattivare o indebolire d'impulso le regole che hai scelto.

Un letterale “il blocco blocca...” sarebbe poco chiaro. La versione italiana è **solo una proposta**: va confrontata con il testo e il controllo in cui compare e con il glossario definitivo.

## Prompt base riutilizzabile (adattare alla lingua e al percorso)

> Agisci come localizzatore madrelingua e UX writer di Ace Blocker, non come traduttore parola per parola. Traduci dall'inglese a **[locale target]** i segmenti JSON allegati per **[app/sito e pagina]**. Utente: **[pubblico]**. Obiettivo della schermata: **[azione]**. Tono: preciso, breve e naturale; per l'app sobrio, per il sito espressivo ma verificabile. Segui il glossario **[glossario approvato]** e i 3–5 esempi **[esempi]**. Non modificare chiavi, placeholder, tag, URL o fatti. Evita calchi, forma passiva burocratica, gergo inutile e promesse aggiunte. Se l'inglese è ambiguo, non inventare: segnala la chiave in un report esterno. Restituisci **solo un oggetto JSON valido**, con esattamente le chiavi fornite; produci le note di revisione in un secondo output separato quando richiesto.

Prompt secondo passaggio:

> Sei un revisore editoriale indipendente. Confronta EN, traduzione in **[locale]**, contesto UI, glossario e limiti del prodotto. Segnala solo: (1) significato alterato/omesso, (2) frase poco idiomatica, (3) terminologia incoerente, (4) placeholder o formati errati, (5) testo non leggibile nel contesto. Per ogni problema fornisci chiave, gravità, proposta corretta e una breve motivazione. Non cambiare ciò che è già naturale; marca `needs_review` quando servono decisioni di prodotto.

## Verifiche per repository

**App desktop — `ace-blocker/apps/ace-app`**

- Fonte EN: `messages/en.json`; destinazioni: `messages/{locale}.json`. La configurazione supporta en, de, it, es, fr, pt, pt-BR; solo en e it sono completi. Il controllo in-app mostra Sistema/English/Italiano.
- Da questa cartella eseguire: `bun run i18n:audit` (integrità _delle chiavi EN referenziate_, non copertura target); `bun run check`; se si modificano viste o formati, test/screenshot appropriati.
- Esaminare in modo speciale: differenza Network Block/Lock; regole attive vs semplicemente scaricate; schedule, date/ore, contatore tentativi locali; vincoli anti-manomissione, stati di update e azioni irreversibili.
- Vedere `docs/ui-identity.md` dell'app (chiarezza prima di personalità del marchio).

**Sito — `ace-blocker-site`**

- Fonte EN: `messages/en.json`; destinazioni: `messages/{locale}.json`; in codice usare `m.chiave()` e link che conservano la lingua (`localizeHref`).
- Da questa cartella eseguire `bun run check` e test pertinenti. Per SEO, verificare `src/lib/seo.ts`: `localesForPath` espone EN/ES/IT/DE solo per `/faq`, EN/IT per le altre pagine pubbliche; non dichiarare ES/DE completi altrove prima di tradurre **tutto** il contenuto utile e i metadati. Poi eseguire `bun run seo:audit` in ambiente disponibile.
- La FAQ usa gli stessi messaggi per il testo visibile e JSON-LD: preservare corrispondenza. Privacy e Terms ora usano chiavi Paraglide anche nel corpo dei componenti; restano obbligatori la revisione legale e il controllo dei claim sulla privacy prima della pubblicazione.
- Controllo umano obbligatorio per checkout, prova gratuita, importi, rinnovo, disdetta, policy di trattamento dati e claim sul prodotto. Sito e app devono usare lo stesso glossario ma il registro dei testi può differire.

## Criteri di accettazione e manutenzione

Per dichiarare completata una lingua o una pagina: **0 errori di JSON/chiavi/placeholder**, check tecnici superati, **0 ambiguità critiche non risolte**, revisione nativa delle schermate rappresentative e dei testi ad alto rischio, nessun troncamento che alteri il significato, nessun percorso SEO spacciato per interamente tradotto quando non lo è. Eseguire una verifica differenziale ogni volta che cambia `en.json` e riaprire solo i segmenti impattati.

**Suggerimento evolutivo:** aggiungere una piccola skill Ace-specifica di _localization editorial QA_ che faccia leggere questo playbook, glossario approvato ed esempi prima di generare stringhe; mantenere le skill generiche esistenti come riferimento tecnico, non come prompt stilistico.
