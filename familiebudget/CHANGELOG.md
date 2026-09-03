# Changelog

## [1.5.1] - 2026-09-03

### Changed
- **"Vaste lasten" heet nu "Wat je elke maand nodig hebt"** en telt ook
  boodschappen, bakker, apotheek en brandstof mee — niet alleen de
  domiciliëringen. Het bedrag is gesplitst in vaste lasten en de rest, zodat je
  ziet waar het uit bestaat.
- **Dit is exact het bedrag waar je spaarbuffer op gebaseerd is**, en dat staat
  er nu bij: "je spaarbuffer is 5× dit bedrag". Op de Sparen-pagina stond
  "5× gem. vaste lasten", maar dat werd gerekend met álle noodzakelijke
  uitgaven — die tekst klopte niet en is aangepast.

### Fixed
- "Uit reserves" in de geldstroom-balk was niet te herleiden. Er staat nu bij
  hoe het bedrag ontstaat: wat er de rekening uit ging, wat er binnenkwam,
  hoeveel daarvan naar de spaarrekening ging, en dus wat er uit bestaand saldo
  kwam.
- Ook het bedrag dat per maand vrij overblijft toont nu zijn eigen som
  (inkomsten − nodig = vrij) in plaats van alleen een uitkomst.
- Dat vrije bedrag vergeleek de inkomsten van één maand met een gemiddelde over
  meerdere maanden zodra je op een maand filterde; beide kanten gebruiken nu
  hetzelfde jaargemiddelde.

## [1.5.0] - 2026-09-03

Het overzicht beantwoordt nu vier vragen die het eerder niet kon.

### Added
- **Waar ging je geld heen** — twee balken op dezelfde schaal: wat er binnenkwam
  en waar het heen ging, inclusief een gearceerd stuk voor wat nog niet is
  ingedeeld en een stuk voor wat naar de spaarrekening ging. Geef je meer uit
  dan er binnenkomt, dan is de onderste balk zichtbaar langer.
- **Vaste lasten** — wat er elke maand al vastligt voordat je iets beslist
  (nu ~€2.100). Herkend aan de domiciliëringen die de bank zelf aanduidt en aan
  betalingen die maandelijks terugkomen, niet aan de vast/variabel-labels: die
  zetten energie en abonnementen ten onrechte onder "variabel". Verzamel-
  rekeningen zoals PayPal en losse gewoontes worden apart gezet en niet
  meegeteld — zichtbaar, zodat je het bedrag kunt controleren.
- **Doelen** — spaarbuffer en potjes staan nu ook op het overzicht, met dezelfde
  cijfers als op de Sparen-pagina.
- **Datadekking** — het overzicht toonde twee verschillende uitgavencijfers naast
  elkaar (alles wat je uitgaf, én alleen het ingedeelde deel) zonder het verschil
  te verklaren. Nu staat overal bij hoeveel van je geld een categorie heeft.

### Fixed
- Spaarbuffer en potjes werden op twee plaatsen apart uitgerekend en konden uit
  elkaar lopen; dat is nu één berekening.

## [1.4.1] - 2026-09-02
### Fixed
- De hover-popup was één blok cursieve tekst waarin dag, agenda en de ruwe
  banklijn door elkaar liepen. Nu met duidelijke secties: bovenaan de dag (en
  wanneer de bank hem boekte als dat verschilt), daaronder AGENDA met de uren
  netjes onder elkaar, dan je eigen MEDEDELING, en onderaan plaats en kaart.
  De ruwe banklijn met kaartnummer en landcode wordt niet meer getoond.
- De popup werd afgeknipt door de tabelcel en was daardoor nauwelijks
  leesbaar; hij hangt nu los van de tabel en wijkt uit als hij niet past.

## [1.4.0] - 2026-09-02

### Added
- **Dag en agenda in de hover** van de transactielijst: zweef over een
  tegenpartij en je ziet welke dag het écht was plus wat er die dag op de
  agenda stond — "zaterdag 06/06 · 13:00 K2 klimschoenen · 15:00 mama en papa
  · 19:00 30 jarig feest Marie". De dag wordt altijd getoond, ook zonder
  agenda: weten dat het zaterdag was is op zichzelf al een aanwijzing.
- **Mededelingen worden slimmer gelezen.** Regels kijken nu ook naar de
  richting van het geld, want hetzelfde woord betekent het omgekeerde:
  "cadeau" op een betaling is er één die jij kocht, op een storting één die je
  kreeg. Daarmee worden 40 huwelijkscadeaus ("proficiat", "huwelijk", "kado
  voor jullie", "leve de liefde") correct als Inkomsten › Gift herkend in
  plaats van als aankoop.

### Fixed
- "Vakantiegeld" werd als vakantie-uitgave gelezen in plaats van als loon; die
  regel geldt nu alleen nog voor uitgaven.

## [1.3.0] - 2026-09-02

### Added
- **Agenda als hint**: toont bij het sorteren wat er in je agenda stond toen je
  betaalde — "Klimmen 🧗", "Brunch Franne", "K2 klimschoenen". Alleen als hint,
  er wordt nooit automatisch een categorie op gezet: een afspraak zegt wat je
  aan het doen was, niet waar het geld heen ging. Aan te zetten in
  Instellingen › Regels, waar je zelf kiest welke agenda's meetellen
  (werkagenda's geven vooral ruis). Leest via Home Assistant — de add-on praat
  met Supervisor over het interne netwerk, HA regelt de Google-koppeling; er
  gaat niets naar buiten. Niet beschikbaar in de desktop-app, die heeft geen
  Home Assistant.

### Fixed
- **De dag van de week klopte niet.** Die werd afgeleid uit de datum waarop de
  bank de betaling boekte, en dat loopt bij kaartbetalingen 1 tot 6 dagen achter
  op je aankoop (gemeten: 331 van 366 kaartlijnen, mediaan 2 dagen). "Koffieland,
  maandag" ging dus over een koffie van vrijdagochtend. De echte datum stond al
  in de mededeling en wordt nu gebruikt.
- Groepen telden dagen op dezelfde verkeerde manier: één namiddag winkelen die
  over drie dagen werd geboekt las als "3 dagen".

## [1.2.0] - 2026-09-01

Categoriseren is nu een stuk minder giswerk. Alles gebeurt offline — geen
internet, geen API, geen kosten.

### Added
- **Herkenningslijst**: een ingebouwde lijst van winkelketens (Kruidvat, HEMA,
  Action, Decathlon…) en algemene vakwoorden (bakker, koffie, klimzaal,
  tandarts…) die tegenpartijen automatisch aan een categorie koppelt. Ketens
  worden meteen toegepast, vakwoorden alleen voorgesteld — die zijn te vaag om
  blind te vertrouwen.
- **Controlelijst voor je iets opslaat**: "Sorteer" toont eerst een lijst met
  elke voorgestelde transactie, de categorie én *waarom* die is gekozen
  ("Herkend: woonwinkel", "Bevat colruyt"). Vink uit wat niet klopt; alleen
  het aangevinkte wordt opgeslagen. Er wordt niets geschreven tot je op
  Toepassen klikt.
- **Aanwijzingen tijdens het sorteren**: plaats, dag en tijdstip stonden al in
  de bankgegevens maar werden nooit getoond. Nu wel — "Koffieland · woensdag
  08:52 · Antwerpen" zegt een stuk meer dan "Koffieland" alleen. Bij groepen
  over meerdere dagen wordt een tijdsbereik getoond in plaats van één
  misleidende dag.
- **Heranalyseer alles** in Instellingen › Regels: doorloopt de bestaande
  achterstand opnieuw met de huidige regels en herkenningslijst. Nodig omdat
  de automatische herberekening alleen liep bij een nieuw geleerd patroon,
  waardoor een bijgewerkte herkenningslijst anders onzichtbaar bleef.

### Changed
- "Sorteer" op het transactietabblad doet nu eerst de automatische controle en
  toont de lijst; daarna ga je door naar het handmatige doorloopscherm voor de
  rest. Stond eerst weggestopt in Instellingen.

### Fixed
- Twee regels (`kredietlasten`, `beheren rek coop`) konden nooit werken: ze
  zochten in tegenpartij + mededeling, terwijl die tekst uitsluitend in het
  `type`-veld van de bank staat. Dat veld wordt nu wél gelezen.

## [1.1.1] - 2026-08-31
### Fixed
- Add-on updates appeared not to apply. Express served the frontend with no
  `Cache-Control` header at all, so browsers fell back to heuristic caching
  and held on to `index.html` — the file that names the content-hashed JS and
  CSS bundles. A stale copy kept loading the previous version's assets even
  though the container had been rebuilt, which looked exactly like the update
  failing. `index.html` is now sent `no-cache` (revalidate, still a cheap 304
  when unchanged) and the hashed assets under `/assets/` are marked immutable,
  since a changed file always gets a new URL

## [1.1.0] - 2026-08-31

Full visual overhaul plus a new comparison tab. Two of the fixes below are
data-safety issues that were silently live in 1.0.22 — see **Fixed**.

### Added
- **Vergelijk tab**: compare any two periods — month vs month, a month vs the
  rest of the year, actual vs budget, or your spending against the average
  Belgian household. Periods of unequal length are normalised to a per-month
  average automatically. A "Kies zelf" mode picks month and year for both
  sides independently, with a swap button
- National benchmark uses Statbel's Household Budget Survey (2024). It
  compares **share of spending**, not euro amounts: Statbel publishes the
  distribution as percentages and does not publish absolute figures by
  household composition, so a euro-level "family of four" comparison would
  have been invented. Shares are also income-neutral. The view warns when
  under 80% of spending is categorised, since the percentages are not
  representative below that
- Comparison ranks the biggest movers in both directions rather than only
  showing a total, so you can see *what* changed
- **First-run onboarding**: household profile, starter categories and an
  optional first budget pass. Everything it sets stays editable afterwards
  in Settings › Profiel
- **Guided processing funnel** replacing the standalone Tinder mode:
  progress overview → fast batch sorting by counterparty → one-by-one review
  of the ambiguous rest → handoff into Sparen
- Dashboard month strip: click a month to scope, shift/⌘-click for several.
  Previously the month filter existed but could only be driven from the
  Transactions tab
- Net trend chart with a labelled zero line and a dashed average reference
- Savings transfers (Sparen & Beleggen) are excluded from spending by
  default, as seeded entries on the Settings exclusion list — remove any of
  them to count that transfer type as spending again
- Responsive layout: the icon rail becomes a bottom tab bar on phones, with
  iOS safe-area handling, and the category picker opens as a bottom sheet
  instead of a desktop-sized popover

### Fixed
- **Automatic backups had never once run.** `backup.js` called `existsSync()`
  without importing it, so every `createBackup()` threw and was swallowed by
  its own try/catch, logging only "[Backup] Failed". The daily snapshot and
  the safety snapshot taken before a restore had both silently no-opped since
  the feature shipped, leaving `/config/backups/` empty
- **Restoring a backup silently discarded all budgets.** Two restore paths had
  diverged; the one reachable from the Importeer button only set local state
  and never called the endpoint that restores budgets (they live under their
  own state key) or takes the pre-import snapshot
- Loading state had no HTTP error check, so a failed read looked identical to
  an empty database and armed the autosave to overwrite the real one with
  empty defaults. A failed read now blocks and reports instead of saving
- Exporting a backup could download an HTTP error body as a "backup" file
- Settings is a real tab now, not a full-screen dialog
- Category picker rendered detached from its button when the trigger sat left
  of centre, and did not follow the button when the view scrolled or zoomed
- Budget tab: overlapping text from three stacked sticky rows at guessed
  offsets; rebuilt as a table with fixed-height frozen rows
- Number fields (known savings balance, pot targets) could not be cleared —
  clearing produced 0, which immediately re-rendered as an undeletable "0"
- Net trend chart drew months with no data as €0, inventing a flat line
  across the rest of the year, and had a visibly uneven stroke width
- Spaarquote card navigated to Transactions instead of Sparen, a leftover
  from when it showed the uncategorised count
- Dashboard KPI cards and expense rows overflowed the screen on mobile
- Quick-categorise button appeared on every tab instead of only Transactions

### Changed
- New visual system: deep indigo dark mode, warm cream light mode, violet
  accent across both, Instrument Serif headings, real icons throughout (no
  emoji)
- Green and red are now reserved strictly for signed euro amounts. Comparison
  deltas use a direction arrow and neutral text, since a delta breaks the
  positive/negative mapping
- Backup export/import format is unchanged from 1.0.22 and round-trips in
  both directions, so rolling back is safe

## [1.0.22] - 2026-08-20
### Fixed
- HA add-on build: added missing `build.yaml` — Supervisor was no longer falling back to a default base image when none was specified, so `docker build` failed with "base name ($BUILD_FROM) should not be blank" and the 1.0.21 update could not install

## [1.0.21] - 2026-08-20
### Added
- Transactions: month and category filters now support selecting multiple values at once (previously single-select only)
- PayPal import: merged transactions are now flagged with `paypalMerged`, shown as a "PP" badge next to the counterparty, and findable by searching "paypal" even though the counterparty was renamed to the real merchant
- PayPal import: re-importing a historical PayPal CSV retroactively backfills the `paypalMerged` marker onto transactions that were merged before this feature existed, shown as "🏷️ Markeer als PayPal" in the import preview
- Transactions: right-click → "🚫 Verwijder categorie" clears a transaction's category, making it uncategorized again
- Categories tab: rename, delete (with a transaction-count warning), and archive for both categories and subcategories — archived items are hidden from the category picker but stay visible (dimmed) in the Categories tab and remain intact in stats/history
- New `IDEAS.md` backlog file for future feature ideas
### Fixed
- PayPal import: uploading a "Balance Reconciliation Report" (a different PayPal export format with no transaction data) now shows a clear explanation and points to the correct export instead of a generic "no transactions found" message
- Tinder mode: skipping a transaction now leaves it truly uncategorized instead of dumping it into the "Nog te verwerken" parking category

## [1.0.20] - 2026-04-08
### Fixed
- Auto-categorization: `/r\.?v\.?a\.?/` matched `rva` inside `vervaldag`, silently misfiling "vervaldag krediet" transactions as Inkomsten › Andere; regex now uses lookbehind/lookahead so RVA only matches as a standalone token
- Auto-categorization: `huur\b` matched the end of `verhuur`, potentially misfiling rental income as Wonen › Lening; fixed to `\bhuur\b`
- Auto-categorization: `eten\b` matched inside `winkelketen`; fixed to `\beten\b`
- CatPicker dropdown cut off at top/bottom of screen; replaced flip logic with viewport-clamped positioning (open below if room, otherwise above, always clamped)
- Dashboard percentage mismatch between pie chart and category bar list; income categories are now excluded from `totalExp`
- Category detail modal: subcategories now sorted by size (largest first), and percentages are relative to total expenses instead of the category total
- Category detail modal: clicking outside the modal now closes it; background scroll is locked while open
- CatPicker dropdown clipped by scroll containers; rebuilt with React portal + `position: fixed`
- Electron: daily backup crashed on second launch because today's backup already existed; now skips gracefully
- Electron: app reopened after closing; now always quits on window-all-closed (all platforms)
### Added
- Auto-categorization: new rule for `vervaldag krediet` / `échéance crédit` descriptions → Wonen › Lening (certain confidence)
- Transactions: right-click context menu now includes "🔍 Toon alle transacties: [tegenpartij]" — filters to that counterparty across all years, clearing all other filters
- Year dropdown: added "Alle jaren" option to view transactions across all years at once
- GitHub Actions: upgraded Node.js from 20 to 22

## [1.0.19] - 2026-04-04
### Fixed
- Electron: app crashed silently before showing any error dialog because `app.getPath('userData')` was called synchronously at module load time, before the app was ready; moved env var setup inside `app.whenReady()`

## [1.0.18] - 2026-04-04
### Fixed
- Electron: app still bounced without opening because ESM `import()` cannot resolve modules across the asar virtual filesystem boundary (e.g. `express` in `app.asar` was unreachable from unpacked `backend/`); disabled asar entirely so all files are real paths on disk

## [1.0.17] - 2026-04-04
### Fixed
- Electron: app bounced in dock and never opened because ESM `import()` cannot read files from inside the asar virtual filesystem; backend files are now unpacked to a real directory (`app.asar.unpacked/backend/`) and `main.js` resolves the correct path when packaged
- Electron: startup errors now show a dialog with the error message instead of silently quitting

## [1.0.16] - 2026-04-04
### Fixed
- Electron build CI: add missing `repository` field to `package.json` and pass `--publish never` to prevent electron-builder from trying to publish directly (upload is handled by the workflow instead)

## [1.0.15] - 2026-04-04
### Fixed
- Desktop layout: header year/theme/settings buttons no longer overlap nav tabs
- Dashboard: pie chart legends no longer get cut off in narrow panels
### Added
- Electron desktop app: self-contained `.exe` (Windows) and `.dmg` (macOS) installers built automatically on each GitHub release — no Home Assistant required

## [1.0.14] - 2026-04-04
### Fixed
- PayPal auto-categorization: now runs autoCat() when a Crelan match exists but has no category assigned
- Mobile layout: header nav scrolls horizontally on small screens; A+/A− zoom buttons hidden on mobile
- Mobile layout: Sorteer button no longer wraps to two lines
- Mobile layout: Dashboard grid collapses to single column on small screens
- Mobile layout: Transaction table scrolls horizontally instead of squishing
- Mobile layout: Budget table scrolls horizontally; column header, Netto Balans, and Inkomsten/Uitgaven rows are sticky
- Mobile layout: Patronen tables scroll horizontally
- Mobile layout: Sparen stats bar wraps instead of overflowing

## [1.0.13] - 2026-04-03
### Fixed
- PayPal import: detect US date format (M/D/YYYY) automatically so March transactions are no longer misread as invalid dates
- PayPal import: support new "Omschrijving" column layout so "Bankstorting" rows are correctly filtered in both old and new PayPal CSV exports

## [1.0.12] - 2026-04-03
### Fixed
- Data no longer lost after update — database now stored in HA persistent config directory

## [1.0.11] - 2026-04-01
### Added
- Added `repository.json` so the add-on is discoverable via the HA add-on store

## [1.0.10] - 2026-03-04
### Added
- Budget tab data is now included in export and wiped by "Verwijder alle data"
- Settings modal redesigned as a tabbed layout (Regels / Patronen / Data)

## [1.0.9] - 2026-03-04
### Fixed
- Fixed split transaction feature crashing due to missing `fD` import
### Added
- Added "Verwijder alle data" button in settings with automatic backup before deletion
- Added `.gitignore` and `launch.json` dev server configurations

## [1.0.8] - 2026-03-02
### Fixed
- Fixed `/run.sh: not found` error by ensuring correct `COPY` path in Dockerfile.
- Restored `nodejs` and `npm` to the `apk add` command (previously missing).
- Deleted problematic `build.yaml` to fix Supervisor regex parsing errors.

## [1.0.7] - 2026-03-02
### Changed
- Attempted dependency fix (failed build due to missing Node.js in Dockerfile).

## [1.0.2] - 2026-03-01
### Changed
- Updated `vite.config.js` with `base: './'` for Home Assistant Ingress compatibility.
- Fixed asset 404 errors in the Web UI.

## [1.0.1] - 2026-03-01
### Fixed
- Set `init: false` in `config.yaml` to resolve `s6-overlay-suexec` PID 1 fatality.
- Added `python3`, `make`, and `g++` to `Dockerfile` for `better-sqlite3` ARM64 compilation.

## [1.0.0] - 2026-03-01
### Added
- Initial local add-on structure for FamilieBudget.