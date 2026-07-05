'use strict';

// Inline SVG icon set — mirrors the procedural icons the firmware projects.
// Everything self-hosted: no fonts, no CDNs, no emoji rendering differences.

const ICONS = {
  off: `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="17" fill="none" stroke="#8a8fb0" stroke-width="3.5"/><line x1="24" y1="8" x2="24" y2="22" stroke="#8a8fb0" stroke-width="3.5" stroke-linecap="round"/></svg>`,

  clock: `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="19" fill="#e8e9f5"/><circle cx="24" cy="24" r="19" fill="none" stroke="#b9bdd9" stroke-width="2"/><line x1="24" y1="24" x2="24" y2="12" stroke="#ffb648" stroke-width="3.5" stroke-linecap="round"/><line x1="24" y1="24" x2="32" y2="28" stroke="#3a3f63" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="24" r="2.4" fill="#3a3f63"/></svg>`,

  sun: `<svg viewBox="0 0 48 48"><g stroke="#ffd23f" stroke-width="3.4" stroke-linecap="round"><line x1="24" y1="2.5" x2="24" y2="9"/><line x1="24" y1="39" x2="24" y2="45.5"/><line x1="2.5" y1="24" x2="9" y2="24"/><line x1="39" y1="24" x2="45.5" y2="24"/><line x1="8.8" y1="8.8" x2="13.4" y2="13.4"/><line x1="34.6" y1="34.6" x2="39.2" y2="39.2"/><line x1="8.8" y1="39.2" x2="13.4" y2="34.6"/><line x1="34.6" y1="13.4" x2="39.2" y2="8.8"/></g><circle cx="24" cy="24" r="11.5" fill="#ffd23f"/><circle cx="20" cy="22" r="1.7" fill="#7a5800"/><circle cx="28" cy="22" r="1.7" fill="#7a5800"/><path d="M19.5 27 Q24 31 28.5 27" fill="none" stroke="#7a5800" stroke-width="2" stroke-linecap="round"/></svg>`,

  moon: `<svg viewBox="0 0 48 48"><path d="M30 4a20 20 0 1 0 14 34A20 20 0 0 1 30 4z" fill="#cdd3ff"/><circle cx="11" cy="12" r="1.6" fill="#8a92d8"/><circle cx="16" cy="34" r="1.2" fill="#8a92d8"/><circle cx="8" cy="24" r="1" fill="#8a92d8"/></svg>`,

  star: `<svg viewBox="0 0 48 48"><path d="M24 3l6.2 12.9L44 18l-10 9.9L36.4 42 24 35.2 11.6 42 14 27.9 4 18l13.8-2.1z" fill="#ffd23f" stroke="#e8a80c" stroke-width="1.5" stroke-linejoin="round"/></svg>`,

  smiley: `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#ffc832"/><circle cx="17" cy="19" r="2.8" fill="#6b4a00"/><circle cx="31" cy="19" r="2.8" fill="#6b4a00"/><path d="M14 28 Q24 37 34 28" fill="none" stroke="#6b4a00" stroke-width="3.2" stroke-linecap="round"/></svg>`,

  heart: `<svg viewBox="0 0 48 48"><path d="M24 42S5 30 5 17.5C5 10.6 10.6 6 16 6c3.5 0 6.5 1.8 8 4.6C25.5 7.8 28.5 6 32 6c5.4 0 11 4.6 11 11.5C43 30 24 42 24 42z" fill="#ff5a7a"/></svg>`,
};

const GEAR_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h0a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h0a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v0a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"/></svg>`;

// Symbol → markup for buttons and the hero. Custom icons render as <img>.
function symbolMarkup(id) {
  if (id && id.startsWith('custom:')) {
    const file = id.slice(7);
    return `<img src="/icons/${encodeURIComponent(file)}" alt="${file}">`;
  }
  return ICONS[id] || ICONS.off;
}

function symbolLabel(id) {
  if (id && id.startsWith('custom:')) return id.slice(7).replace(/\.png$/i, '');
  return id;
}
