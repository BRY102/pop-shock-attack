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

window.togglePasswordVisibility = function (inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';

    if (isPass) {
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" x2="22" y1="2" y2="22"></line></svg>`;
        btn.setAttribute('aria-label', 'Hide password');
    } else {
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        btn.setAttribute('aria-label', 'Show password');
    }
};

window.checkCpPasswordStrength = function (val) {
    const bars = document.querySelectorAll('#cp_strength .strength-bar');
    const label = document.getElementById('cp_strength_label');
    if (!bars.length) return;

    if (!val) {
        bars.forEach(b => { b.style.backgroundColor = '#e4e8ee'; });
        if (label) {
            label.textContent = 'Password strength';
            label.style.color = '#8d99ac';
        }
        return;
    }

    let score = 1;
    if (val.length >= 8 && (/\d/.test(val) || /[A-Z]/.test(val))) score = 2;
    if (val.length >= 8 && /\d/.test(val) && (/[A-Z]/.test(val) || /[^A-Za-z0-9]/.test(val))) score = 3;

    const colors = ['#ef4444', '#f59e0b', '#10b981'];
    const texts = ['Weak', 'Medium', 'Strong'];
    const activeColor = colors[score - 1];

    bars.forEach((b, idx) => {
        b.style.backgroundColor = idx < score ? activeColor : '#e4e8ee';
    });

    if (label) {
        label.textContent = texts[score - 1];
        label.style.color = activeColor;
    }
};

window.openChangePassword = function () {
    closeProfileMenu();
    const form = document.getElementById('cp_current')?.form;
    if (form) form.reset();
    ['cp_current', 'cp_new', 'cp_confirm'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.type = 'password';
    });
    document.querySelectorAll('#modal-change-password .pass-toggle-btn').forEach(btn => {
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        btn.setAttribute('aria-label', 'Show password');
    });
    checkCpPasswordStrength('');
    openModal('modal-change-password');
};

window.submitChangePassword = function (e) {
    e.preventDefault();
    const currentPass = document.getElementById('cp_current')?.value || '';
    const newPass = document.getElementById('cp_new')?.value || '';
    const confirmPass = document.getElementById('cp_confirm')?.value || '';

    if (!currentPass) {
        showNotification('Please enter your current password.', 'error');
        return;
    }
    if (newPass.length < 8) {
        showNotification('New password must be at least 8 characters.', 'error');
        return;
    }
    if (newPass !== confirmPass) {
        showNotification('New passwords do not match.', 'error');
        return;
    }

    closeModal('modal-change-password');
    showNotification('Password updated successfully!', 'success');
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
