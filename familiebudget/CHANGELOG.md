# Changelog

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