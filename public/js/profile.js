// ============================================================
// MotoTrack — Header profile menu
// Initials + dropdown for every role. Change Password is UI only for now.
// Activity Log lists this account's logins, page visits, and shop actions.
// ============================================================

function profileInitials(name) {
    const parts = String(name || '').trim().split(/[\s._-]+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function isProfileMenuOpen() {
    const menu = document.getElementById('profileMenu');
    return Boolean(menu && !menu.classList.contains('hidden'));
}

function roleCaption(role) {
    if (role === 'admin') return 'Administrator';
    if (role === 'staff') return 'Staff';
    if (role === 'customer') return 'Customer';
    return 'Account';
}

function paintProfile() {
    const initials = profileInitials(currentUser);
    const name = displayName(currentUser) || '—';
    const caption = roleCaption(currentRole);
    const online = Boolean(currentUser);

    const ava = document.getElementById('profileAva');
    const btn = document.getElementById('profileBtn');
    const nameEl = document.getElementById('profileName');
    const sideAva = document.getElementById('sidebarAva');
    const sideName = document.getElementById('sidebarUserName');
    const sideRole = document.getElementById('sidebarUserRole');

    if (ava) {
        ava.textContent = initials;
        ava.classList.toggle('is-online', online);
    }
    if (nameEl) nameEl.textContent = currentUser ? name : '';
    if (btn) {
        btn.setAttribute('aria-label', currentUser
            ? `Account menu for ${name}`
            : 'Account menu');
    }
    if (sideAva) {
        sideAva.textContent = initials;
        sideAva.classList.toggle('is-online', online);
    }
    if (sideName) sideName.textContent = currentUser ? name : '—';
    if (sideRole) sideRole.textContent = currentUser ? caption : '—';
}

function closeProfileMenu() {
    const menu = document.getElementById('profileMenu');
    const btn = document.getElementById('profileBtn');
    menu?.classList.add('hidden');
    btn?.setAttribute('aria-expanded', 'false');
}

window.closeProfileMenu = closeProfileMenu;
window.paintProfile = paintProfile;

window.toggleProfileMenu = function (e) {
    e?.stopPropagation();
    const menu = document.getElementById('profileMenu');
    const btn = document.getElementById('profileBtn');
    if (!menu) return;

    const opening = menu.classList.contains('hidden');
    menu.classList.toggle('hidden', !opening);
    btn?.setAttribute('aria-expanded', opening ? 'true' : 'false');
    if (opening) {
        window.closeNotifPanel?.();
        window.closeFeedbackDrawer?.();
        window.closeQuickMenu?.();
    }
};

window.openChangePassword = function () {
    closeProfileMenu();
    document.getElementById('cp_current')?.form?.reset();
    openModal('modal-change-password');
};

window.submitChangePassword = function (e) {
    e.preventDefault();
};

window.openActivityLog = async function () {
    closeProfileMenu();
    openModal('modal-activity-log');
    await renderActivityLog();
};

async function renderActivityLog() {
    const body = document.getElementById('activityLogBody');
    if (!body) return;

    body.innerHTML = `<div class="alog-empty">Loading…</div>`;

    try {
        const response = await apiFetch('/api/activity-logs');
        if (!response.ok) {
            body.innerHTML = `<div class="alog-empty">Could not load activity.</div>`;
            return;
        }

        const data = await response.json();
        const logs = Array.isArray(data.logs) ? data.logs : [];
        if (logs.length === 0) {
            body.innerHTML = `<div class="alog-empty">No activity yet.</div>`;
            return;
        }

        body.innerHTML = logs.map((row) => {
            const line = `${row.logged_at || ''} | ${row.ip_address || ''} : ${row.action || ''}`;
            return `<div class="alog-row">${esc(line)}</div>`;
        }).join('');
    } catch (error) {
        console.error(error);
        body.innerHTML = `<div class="alog-empty">Could not load activity.</div>`;
    }
}

document.addEventListener('click', (e) => {
    const wrap = document.getElementById('profileWrap');
    if (wrap && !wrap.contains(e.target)) closeProfileMenu();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isProfileMenuOpen()) closeProfileMenu();
});
