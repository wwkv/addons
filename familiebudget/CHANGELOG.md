# Changelog

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