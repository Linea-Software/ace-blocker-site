# Ace Blocker — traduzione LLM e localizzazione naturale

> Playbook operativo condiviso per **Ace Blocker Site** e **Ace Blocker Desktop**. Revisione: 2026-11-06. I numeri sotto sono uno snapshot, non un test dinamico.

## Obiettivo

Pubblicare testi che sembrino scritti originariamente nella lingua di destinazione, restando precisi sul funzionamento del prodotto. **Tradurre l'esperienza, non le parole isolate**: nessuna traduzione letterale, enfasi pubblicitaria artificiale, promessa aggiunta o ambiguità su lock, orari, abbonamenti e dati. L'inglese è la sorgente attuale; non assumere che ogni frase sorgente sia già ottimale.

## Stato verificato (2026-11-06)

| Repository                 | Sorgente EN                      | Locali configurati            | Chiavi già tradotte   |
| -------------------------- | -------------------------------- | ----------------------------- | --------------------- |
| `ace-blocker/apps/ace-app` | 720 chiavi in `messages/en.json` | en, de, it, es, fr, pt, pt-BR | it: 13; altre: 0      |
| `ace-blocker-site`         | 724 chiavi in `messages/en.json` | en, es, it, de                | es/it/de: 56 ciascuno |

I conteggi riguardano le chiavi e **non** equivalgono a copertura effettiva di pagine o UI. Entrambi i progetti usano Paraglide/inlang, ma i relativi file `project.inlang/settings.json` non sono identici. Non cambiare versione o sintassi del message format solo per tradurre.

## Stato successivo alla prima implementazione (2026-11-06)

I conteggi sopra documentano **il punto di partenza**. Dopo la localizzazione
EN/IT, il catalogo desktop conta 731 chiavi per lingua e quello del sito 805. I corpi di Privacy e Terms ora usano Paraglide, e il sito pubblica
le pagine italiane tramite il gate SEO; gli altri locali non sono stati
dichiarati completi. I controlli tecnici superati non equivalgono a una
revisione madrelingua/legale: la pubblicazione richiede soprattutto un
controllo competente dei testi su lock, pagamenti, privacy, termini e dati.

## Fonti e precedenze

1. Verità di prodotto: codice e contenuti correnti, documentazione su blocchi, lock, schedule, resistance, pagamenti e privacy. Se un testo è ambiguo o sembra falso, **segnalarlo**, non correggerlo in modo creativo.
2. Terminologia e tono: questo documento + glossario approvato per ciascuna lingua (da mantenere insieme alle PR).
3. Segmenti originali: `messages/en.json` di ciascun progetto e, ove necessario, contenuti non ancora internazionalizzati.
4. Skill tecniche di supporto: `.agents/skills/i18n-localization/SKILL.md` nel workspace e `ace-blocker-site/.agents/skills/paraglide-js-internationalization-i18n/SKILL.md`. Sono **guide tecniche generiche**, non una garanzia di buona prosa; per gli import usare il pattern effettivo del progetto (`import * as m` e `m.chiave()`) e Bun, non gli esempi generici della skill che citano altri framework/npm.

## Tonalità Ace

- **App desktop:** breve, calmo, diretto, preciso, non moralizzante. Mostrare chiaramente stato, conseguenza e azione; preferire frasi quotidiane a gergo astratto.
- **Sito:** più espressivo nei titoli, ma verificabile e concreto. Non promettere risultati garantiti, compatibilità, protezioni o funzioni non confermate.
- **Entrambi:** naturalezza madrelingua, lessico coerente e inclusivo; evitare calchi dall'inglese, anglicismi superflui, passivi burocratici, superlativi inventati, punti esclamativi di marketing e sinonimi alternati per uno stesso concetto.
- Sono ammesse trasposizioni di sintassi, ordine e lunghezza purché il significato resti invariato. Prima chiarezza, poi brevità; non troncare spiegazioni di sicurezza o vincoli per farle stare in UI.

## Glossario da approvare prima della prima ondata

| Concetto EN          | Significato da preservare                                                                                              | Proposta IT da validare                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Network Block        | Regola/configurazione che applica filtri a siti o categorie secondo un programma                                       | `blocco di rete`                                                      |
| Lock / time-lock     | Vincolo che protegge **le impostazioni** di un blocco da modifiche che lo indebolirebbero; non aggiunge siti bloccati  | `blocco delle modifiche` / `protezione delle regole` secondo contesto |
| Locked               | Una regola non può essere indebolita finché il vincolo è attivo                                                        | `modifiche bloccate` oppure `protetto`, secondo il controllo          |
| Schedule             | Intervalli/orari in cui il Network Block applica le sue regole                                                         | `programmazione` / `orari programmati`                                |
| Resistance Mode      | Strumenti che introducono attrito/riducono elementi distraenti nei siti supportati; non equivalenti a un Network Block | `modalità Resistenza` (nome prodotto da convalidare)                  |
| Category / Site Pack | Elenco di siti; il download **non** attiva da solo il blocco                                                           | `categoria` (distinguere da lista personalizzata)                     |
| Pro / Ace Blocker    | Nome commerciale, piano o marchio                                                                                      | lasciare invariato                                                    |

Questo glossario è **proposto**, non un elenco già approvato. Scegliere termini finali con esempi UI reali, poi usare la stessa terminologia nel sito, nell'app, nelle FAQ e nelle email. In particolare non rendere `Lock` e `Network Block` entrambi con il generico `blocco` quando crea ambiguità. Per spagnolo scegliere prima ES-ES vs spagnolo internazionale; per portoghese mantenere distinti pt e pt-BR.

## Procedura per ogni lingua / funzionalità

1. **Seleziona per esperienza, non per centinaia di chiavi casuali.** Raggruppa 20–50 chiavi di una schermata o percorso (es. creazione Network Block, applicazione degli orari, lock, checkout, FAQ). Per ogni chiave allega testo EN, chiave, schermata, tipo di controllo, azione/scopo, spazio disponibile, variabili ed eventuale screenshot. Escludi chiavi già revisionate salvo modifiche della sorgente.
2. **Congela il brief.** Specifica lingua/variante regionale, pubblico, tono, glossario approvato, termini da non tradurre e regole di prodotto. Fornisci 3–5 esempi di ottime frasi già approvate nella lingua; è il mezzo più efficace per evitare “traduttese”.
3. **Prima passata LLM (traduttore editoriale).** Richiedi un JSON contenente esattamente le chiavi richieste, valori naturali nella lingua target. Consenti riformulazioni, ma vieta omissioni, claim aggiunti e modifiche al comportamento. Le ambiguità si annotano separatamente, non si risolvono inventando.
4. **Seconda passata indipendente (revisore).** In una chiamata distinta, preferibilmente senza mostrare il ragionamento del traduttore, confronta sorgente, contesto e proposta. Cerca calchi, falsi amici, significati invertiti, incoerenza del glossario, tono fuori marca, ambiguità su limiti e stati. Restituisci solo le modifiche motivate e un elenco `needs_review`; non sovrascrivere tutto per gusti soggettivi.
5. **Revisione umana mirata.** Un madrelingua o revisore competente approva le schermate principali. Revisione obbligatoria per: lock/anti-manomissione, date e orari, avvisi irreversibili, privacy, termini legali, prezzi, trial, rinnovo, disdetta e sicurezza. L'LLM non sostituisce revisione legale o conferma dei dati commerciali.
6. **QA automatico e visuale.** Valida JSON e chiavi; controlla placeholder, formattazione, output per locale, compilazione Paraglide, screenshot in finestra stretta, desktop, light/dark, testi troncati, pluralizzazione e lettura con dati reali. Non basarsi solo sulla retrotraduzione.
7. **Pubblica per pagina/percorso completi.** Non indicizzare una pagina come localizzata se il corpo principale è ancora inglese. Archivia linguaggio scelto, prompt, modello/versione, data, revisore, esito QA e stringhe che necessitano un secondo intervento.

## Vincoli automatici non negoziabili

- Stesso insieme di chiavi dell'input, stesso formato JSON e valori stringa; niente commenti, markdown o nuove chiavi nel file localizzato.
- Preservare **esattamente** placeholder e sintassi (`{days}`, `{count}`, `{version}`, `{name}`), nomi tecnici/brand, tag/markup presenti, URL, identificatori e sequenze di escape.
- Non concatenare stringhe tradotte in modo da imporre l'ordine grammaticale inglese. Per plurali/varianti consultare il message format effettivamente installato, senza inventare sintassi ICU non verificata.
- Fallback EN consentito internamente ma non dichiarare “tradotto” un percorso con parti essenziali in EN. Evidenziare stringhe non tradotte o troppo simili alla sorgente per controllo, senza considerare errori i brand.
- Controllare ortografia, punteggiatura, formati di date/numeri, espansione dei bottoni, leggibilità screen reader e RTL se la lingua lo richiede.
- Nessuna chiave, dato personale, credenziale o contenuto privato non necessario inviato ai prompt.

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
