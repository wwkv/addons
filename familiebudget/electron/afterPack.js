'use strict';

/**
 * Ad-hoc sign the macOS app after packaging.
 *
 * WHY THIS EXISTS
 *
 * There is no Apple Developer ID for this project, so electron-builder skips
 * signing entirely. What it leaves behind is not "unsigned" in a neutral sense
 * — it is a bundle whose linker-produced signature disagrees with its own
 * contents. `spctl` reports:
 *
 *     code has no resources but signature indicates they must be present
 *
 * That is a VALIDITY failure, not a policy one, and macOS words the two very
 * differently:
 *
 *   invalid signature  → "Squirrel is damaged and can't be opened. You should
 *                         move it to the Trash."   ← no way out for the user
 *   valid, not trusted → "Squirrel cannot be opened because it is from an
 *                         unidentified developer." ← Open Anyway works
 *
 * The first message is indistinguishable from a corrupt download and is the
 * single most likely reason someone gives up on installing this. A plain ad-hoc
 * signature costs nothing, fixes the bundle seal, and restores the correct
 * identifier (be.ward.familiebudget instead of "Electron"), turning an
 * unrecoverable error into an ordinary one-time confirmation.
 *
 * It does NOT make the app trusted, and it cannot: that needs a paid Developer
 * ID and notarisation. It also does not make auto-update work on macOS —
 * Squirrel.Mac verifies signatures before applying an update, and an ad-hoc
 * signature does not satisfy it. See README-desktop.md.
 */
const { execFileSync } = require('child_process');
const path = require('path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appName = `${context.packager.appInfo.productFilename}.app`;
  const appPath = path.join(context.appOutDir, appName);

  try {
    execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'pipe' });
    // Verify rather than assume: a signature that does not verify is exactly
    // the state this hook exists to prevent, and failing loudly here is much
    // cheaper than someone discovering it as "damaged" after downloading.
    execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], { stdio: 'pipe' });
    console.log(`  • ad-hoc gesigneerd en geverifieerd  ${appName}`);
  } catch (e) {
    const detail = (e.stderr && e.stderr.toString().trim()) || e.message;
    throw new Error(`ad-hoc signeren van ${appName} mislukt: ${detail}`);
  }
};
