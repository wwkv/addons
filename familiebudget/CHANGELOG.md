# Changelog

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