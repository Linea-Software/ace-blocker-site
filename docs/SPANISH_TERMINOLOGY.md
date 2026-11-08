# Ace Blocker — glossario spagnolo internazionale e QA editoriale

Data: 6 novembre 2026 · Locale: `es` (Spagna e America Latina) · Fonte primaria: `messages/en.json` dei due prodotti.

Questo documento registra le convenzioni usate per Ace Blocker Desktop e Ace Blocker Site. Il testo spagnolo è una localizzazione editoriale assistita da GPT-6, confrontata con l'inglese e con il funzionamento documentato del prodotto. **Non equivale alla certificazione di un revisore madrelingua o di un legale**.

## Terminologia approvata per la traduzione

| Concetto EN                         | Spagnolo `es`                                          | Distinzione semantica                                                                                   |
| ----------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Network Block                       | **bloqueo de red**                                     | Configurazione di siti/categorie e orari: applica il filtro solo nei periodi configurati.               |
| Block (nel contesto Network Blocks) | **bloqueo**                                            | Forma breve solo quando è evidente che si parla del filtro sui siti.                                    |
| Lock                                | **protección contra cambios**, **protección**          | Impedisce di eliminare, disattivare o indebolire una configurazione: **non** aggiunge siti da bloccare. |
| Hard / timed lock                   | **protección estricta**, **protección temporal**       | Protezione non rimovibile fino al termine.                                                              |
| Schedule lock                       | **protección por horario**                             | Vincolo alle modifiche applicato durante il periodo previsto dalla configurazione.                      |
| Reflection Lock                     | **protección con reflexión**                           | Richiede una domanda di riflessione e un'attesa di 5 minuti per disattivare la protezione.              |
| Locked (settings)                   | **cambios protegidos**                                 | Stato delle modifiche, non stato del filtraggio di rete.                                                |
| Schedule                            | **horario**, **horas programadas**                     | Periodi settimanali di applicazione dei blocchi, con orario e fuso salvati.                             |
| Resistance Mode                     | **Modo Resistencia**, **Resistencia**                  | Modifica le funzionalità distraenti dei siti compatibili, senza necessariamente impedire l'accesso.     |
| Categories / Site Packs             | **categorías**, **categorías seleccionadas**           | Gruppi di domini disponibili, non necessariamente applicati a un blocco.                                |
| Custom Lists                        | **listas personalizadas**                              | Liste importate e riutilizzabili, disponibili con Pro.                                                  |
| Downloaded / attached / enabled     | **descargada** / **añadida al bloqueo** / **activado** | Distinguere disponibilità dei dati dall'applicazione della regola.                                      |
| Blocking attempts                   | **intentos de acceso bloqueados**                      | Contatore di tentativi, non numero di domini unici.                                                     |
| Safe Search                         | **Búsqueda segura**                                    | Filtraggio del contenuto esplicito nei motori compatibili.                                              |
| Free / Pro                          | **Free / Pro**                                         | Nomi commerciali non tradotti.                                                                          |
| Engine                              | **motor**                                              | Motore locale di Ace Blocker.                                                                           |
| Backup                              | **copia de seguridad**                                 | File/copia della configurazione.                                                                        |
| Cloud backup                        | **copia de seguridad en la nube**                      | Funzione Pro di salvataggio/ripristino sull'account.                                                    |
| Account                             | **cuenta**                                             | Profilo personale.                                                                                      |
| Subscription                        | **suscripción**                                        | Abbonamento a un piano.                                                                                 |
| Renewal / cancellation              | **renovación / cancelación**                           | Distinguere rinnovo automatico, interruzione dei pagamenti e fine dell'accesso.                         |

## Registro e convenzioni

- Seconda persona singolare **tú**; niente alternanza immotivata con `usted` o `vos`.
- Spagnolo standard transatlantico: **equipo / dispositivo** dove evita `ordenador/computadora`, `sitio web`, `configuración`, `correo electrónico`.
- Pulsanti brevi e imperativi: `Guardar`, `Eliminar`, `Descargar`, `Proteger`; conferme esplicitano effetti e irreversibilità.
- Per i contatori utilizzare chiavi esistenti `_zero`, `_one` e plurale con `countMessage`; controllare 0, 1, molti.
- Preservare brand, URL, placeholder, importi, durata della prova, condizioni di rinnovo, fusi e riferimenti a terzi.
- Le etichette delle anteprime dense sono accorciate dove serve: `Feeds laborales`, `Elegidos`, `Autom.`.

## Revisione di significato e naturalezza

- `control_lock_help_detail` / `lock_explanation`: chiarito che una protezione **non blocca più siti** e non estende il filtro fuori orario.
- `lock_preview_schedule`, `lock_preview_until`, `lock_support_note`: conservati i vincoli sui cambiamenti, le scadenze e i limiti dell'assistenza.
- `tour_blocked_attempts_body`: evitato il fraintendimento «numero di siti» quando il contatore misura i **tentativi**.
- `category_apply_note`: esplicitato che **scaricare** una categoria non significa attivarne il blocco.
- Le frasi del checkout distinguono importo dovuto oggi, prezzo periodico, rinnovo e annullamento.
- Le anteprime del sito hanno rivelato troncamenti in spagnolo; le etichette sono state abbreviate mantenendone il significato.

## Rischi da verificare prima della pubblicazione commerciale

1. **Revisione legale umana delle pagine Privacy e Terms**, in particolare dichiarazioni su crittografia, conservazione, cancellazione, diritti degli interessati, dati di uso di Resistenza, terze parti, limitazione di responsabilità, sospensione, rimborsi e diritto applicabile nei mercati di destinazione. Non introdurre unilateralmente varianti regionali o clausole nuove.
2. **Testi sorgente EN da chiarire**: `faq_a1` e `home_what_is_description` possono suggerire che la protezione mantenga attivo il filtro fuori orario; `onboarding_resistance_toggle_hint` promette regolazione «in qualsiasi momento» benché una protezione attiva possa impedirla; `category_apply_note` EN usa un soggetto semanticamente ambiguo; `onboarding_welcome_body` non precisa il requisito Pro di Resistenza. Non modificare di nascosto la sorgente nell'ambito della traduzione spagnola.
3. **Claim funzionali/commerciali da confermare**: tempi «circa un minuto» per la configurazione, piattaforme effettivamente disponibili, durata prova 14 giorni, disponibilità funzionalità Free/Pro e categorie, eventuali prezzi/valute dipendenti dal mercato e condizioni Dodo Payments.
4. **QA necessario prima del rilascio**: revisione editoriale indipendente da madrelingua, test di checkout e account con ambiente autenticato, test della WebView nativa e della lingua del sistema su Windows/macOS/Linux, controllo responsivo delle modali e del tema scuro. Gli screenshot del browser di sviluppo non provano il comportamento del motore Tauri.

## Verifiche tecniche

Cataloghi in `messages/es.json`: Desktop 748/748 chiavi EN; Site 818/818. Placeholder invariati. SvelteKit/Paraglide compilano; test per contatori 0/1/multipli e selettori lingua aggiunti/aggiornati. URL locali e SEO del sito includono `/es` nei canonical, hreflang e sitemap delle 7 pagine pubbliche. I test e le limitazioni effettivamente verificati sono riportati nel report di consegna.
