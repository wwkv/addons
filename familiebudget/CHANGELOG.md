# Changelog

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