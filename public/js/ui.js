// ============================================================
// MotoTrack — UI helpers (escaping, dates, toasts, modals)
// ============================================================

// Escape user-entered text before interpolating it into HTML,
// so names like O'Brien or <script> can't break the markup.
function esc(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function displayName(value) {
    return String(value ?? '')
        .trim()
        .split(/\s+/)
        .map(part => part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : '')
        .join(' ');
}

// A date as YYYY-MM-DD in local time (toISOString() would shift to UTC).
function toISODate(d = new Date()) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function formatWarrantyDate(iso) {
    if (!iso) return '';
    const [y, m, d] = String(iso).split('-').map(Number);
    if (!y || !m || !d) return String(iso);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    });
}

// Unit-level coverage: first Release starts the 6-month window; later visits
// do not extend it. Compare expiry to today the same way free claims are allowed.
function unitWarrantyState(jobs) {
    const dated = (jobs || []).filter(j => j.warranty_expires_at);
    if (!dated.length) return { state: 'none', expires: null };

    dated.sort((a, b) => String(b.warranty_expires_at).localeCompare(String(a.warranty_expires_at)));
    const expires = dated[0].warranty_expires_at;
    return {
        state: expires >= toISODate() ? 'active' : 'expired',
        expires,
    };
}

function warrantyProofCard(state) {
    if (state.state === 'active') {
        return `<div class="warranty-proof is-active">
            <span class="warranty-proof-kicker">Warranty</span>
            <strong>Still valid</strong>
            <p>Covered until ${esc(formatWarrantyDate(state.expires))}. Free re-service is allowed.</p>
        </div>`;
    }
    if (state.state === 'expired') {
        return `<div class="warranty-proof is-expired">
            <span class="warranty-proof-kicker">Warranty</span>
            <strong>Expired</strong>
            <p>Ended ${esc(formatWarrantyDate(state.expires))}. New work is billed.</p>
        </div>`;
    }
    return `<div class="warranty-proof is-none">
        <span class="warranty-proof-kicker">Warranty</span>
        <strong>Not started</strong>
        <p>Coverage begins when this unit is first released.</p>
    </div>`;
}

// Peso formatting for stat tiles, chart axes, and tooltips
const peso = v => '₱' + Number(v).toLocaleString();

function starsDisplay(score) {
    const n = Math.round(Number(score) || 0);
    if (n < 1 || n > 5) return `<span class="stars-empty">Not rated</span>`;
    const glyphs = [1, 2, 3, 4, 5]
        .map(i => `<span class="star${i <= n ? ' is-on' : ''}">★</span>`)
        .join('');
    return `<span class="stars" aria-label="${n} out of 5">${glyphs}</span>`;
}

// "2026-07" -> "Jul 2026" for chart labels
function monthLabel(key) {
    const [y, m] = key.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

// "2026-07-04" -> "Jul 4" without UTC parsing surprises
function dayLabel(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleString('en-US', { month: 'short', day: 'numeric' });
}

// The parts a job consumed, as [{ name, qty }]. Jobs logged since the
// consumables tracker landed carry an exact list; older ones are derived from
// their spec strings ("Oil Seal 41x54x11 (2 - Both)" -> 2 of that seal) so
// their usage and cost still count.
function consumablesOf(specs) {
    if (Array.isArray(specs.consumables) && specs.consumables.length > 0) {
        return specs.consumables.map(line => ({ name: line.name, qty: Number(line.qty) || 0 }));
    }

    const lines = [];
    [specs.oil, specs.oilSeal, specs.dustSeal, specs.springs].forEach(raw => {
        if (!raw || raw === 'None') return;
        const qtyMatch = raw.match(/\((\d+)/);
        lines.push({ name: raw.split(' (')[0], qty: qtyMatch ? parseInt(qtyMatch[1]) : 1 });
    });

    return lines;
}

// The suspension setup recorded for a unit, as ready-to-escape label lines.
// Returns an empty array for jobs with nothing logged yet — units still at
// Intake, and jobs from before these parameters were captured.
function suspensionLines(job) {
    const lines = [];
    if (job.suspension_type) lines.push(`Suspension: ${esc(job.suspension_type)}`);
    if (job.suspension_brand) lines.push(`Brand: ${esc(job.suspension_brand)}`);
    if (job.oil_viscosity) lines.push(`Viscosity: ${esc(job.oil_viscosity)}`);
    if (job.spring_rate) lines.push(`Spring Rate: ${esc(job.spring_rate)} kg/mm`);
    return lines;
}

// Inline SVG icons (Lucide, ISC license — lucide.dev). Rendered at 1em and
// stroked with currentColor so they inherit the button's size and color.
const ICONS = {
    printer: '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    'calendar-days': '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>',
    'calendar-range': '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M17 14h-6"/><path d="M13 18H7"/><path d="M7 14h.01"/><path d="M17 18h.01"/>',
    'calendar-clock': '<path d="M16 14v2.2l1.6 1"/><path d="M16 2v4"/><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M3 10h5"/><path d="M8 2v4"/><circle cx="16" cy="16" r="6"/>',
    banknote: '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
    wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2.3"/><path d="M15 12a1 1 0 0 0-1-1H3a2 2 0 0 0 0 4h12a1 1 0 0 0 1-1z"/>',
    'circle-dollar': '<circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/>',
    'circle-check': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    receipt: '<path d="M12 17V7"/><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8"/><path d="M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z"/>',
    'trending-up': '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
    'trending-down': '<path d="M16 17h6v-6"/><path d="m22 17-8.5-8.5-5 5L2 7"/>',
    'rotate-ccw': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    search: '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
    inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    'shield-check': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    'user-plus': '<path d="M2 21a8 8 0 0 1 13.292-6"/><circle cx="10" cy="8" r="5"/><path d="M19 16v6"/><path d="M22 19h-6"/>',
    key: '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>',
    'triangle-alert': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    'clipboard-list': '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    sliders: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
    'message-circle': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'chevron-left': '<path d="m15 18-6-6 6-6"/>',
    'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    package: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    'clipboard-check': '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    'layout-grid': '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    ellipsis: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    cog: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    bike: '<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    tag: '<path d="M12.4 2.6A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4Z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
};

const STAGE_LINE_ICONS = {
    Intake: 'clipboard-list',
    Disassembly: 'wrench',
    Tuning: 'sliders',
    QA: 'check',
    Release: 'flag',
};

function stationNumber(index) {
    return String(index + 1).padStart(2, '0');
}

function icon(name) {
    return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

function showNotification(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    // Never stack duplicates of a toast that's still on screen
    for (const existing of container.children) {
        if (existing.dataset.message === message) return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.dataset.message = message;
    toast.innerHTML = `<span>${esc(message)}</span><button class="toast-close" onclick="this.parentElement.remove()">&times;</button>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.4s ease forwards';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

window.openModal = function (id) {
    document.getElementById(id).classList.remove('hidden');
};

window.closeModal = function (id) {
    document.getElementById(id).classList.add('hidden');
    if (id === 'modal-intake') window.closeIntakeBrandMenu?.();
};

// ------------------------------------------------------------
// Quick actions dropdown (Overview header)
// ------------------------------------------------------------

window.closeQuickMenu = function () {
    const menu = document.getElementById('quickMenu');
    const trigger = document.getElementById('quickTrigger');
    if (!menu) return;
    menu.classList.add('hidden');
    trigger?.setAttribute('aria-expanded', 'false');
};

window.toggleQuickMenu = function (e) {
    e?.stopPropagation();
    const menu = document.getElementById('quickMenu');
    const trigger = document.getElementById('quickTrigger');
    if (!menu) return;

    const opening = menu.classList.contains('hidden');
    menu.classList.toggle('hidden', !opening);
    trigger?.setAttribute('aria-expanded', opening ? 'true' : 'false');

    // The notification panel occupies the same corner
    if (opening) window.closeNotifPanel?.();
};

document.addEventListener('click', (e) => {
    const wrap = document.getElementById('quickWrap');
    if (wrap && !wrap.contains(e.target)) closeQuickMenu();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeQuickMenu();
});

// ------------------------------------------------------------
// Per-row action menus (table "..." buttons)
// ------------------------------------------------------------

window.closeRowMenus = function () {
    document.querySelectorAll('.row-menu').forEach(menu => menu.classList.add('hidden'));
    document.querySelectorAll('.row-menu-btn[aria-expanded="true"]')
        .forEach(btn => btn.setAttribute('aria-expanded', 'false'));
};

// The menu is positioned as fixed against the button's screen rect: a table
// row menu would otherwise be clipped by the scrolling .table-container.
window.toggleRowMenu = function (e, id) {
    e.stopPropagation();
    const menu = document.getElementById(`rowMenu-${id}`);
    const button = e.currentTarget;
    if (!menu) return;

    const isOpen = !menu.classList.contains('hidden');
    closeRowMenus();
    if (isOpen) return;

    menu.style.visibility = 'hidden';
    menu.classList.remove('hidden');

    const rect = button.getBoundingClientRect();
    const gap = 6;
    const left = Math.max(8, Math.min(rect.right - menu.offsetWidth, window.innerWidth - menu.offsetWidth - 8));
    const below = rect.bottom + gap;
    const fitsBelow = below + menu.offsetHeight <= window.innerHeight - 8;

    menu.style.left = `${left}px`;
    menu.style.top = `${fitsBelow ? below : Math.max(8, rect.top - menu.offsetHeight - gap)}px`;
    menu.style.visibility = '';

    button.setAttribute('aria-expanded', 'true');
};

document.addEventListener('click', (e) => {
    if (!e.target.closest?.('.row-menu-wrap')) closeRowMenus();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeRowMenus();
});

// A fixed menu cannot follow its row, so any scroll or resize dismisses it
window.addEventListener('resize', () => closeRowMenus());
document.addEventListener('scroll', () => closeRowMenus(), true);
