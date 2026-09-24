// ============================================================
// MotoTrack — Authentication (login, registration, logout)
// ============================================================

window.toggleAuthMode = function (mode) {
    document.getElementById('mainLoginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('forgotForm').classList.add('hidden');
    document.getElementById('loginError').classList.add('hidden');

    if (mode === 'register') {
        document.getElementById('registerForm').classList.remove('hidden');
    } else if (mode === 'forgot') {
        document.getElementById('forgotForm').classList.remove('hidden');
    } else {
        document.getElementById('mainLoginForm').classList.remove('hidden');
    }
};

window.toggleLoginPassword = function () {
    const input = document.getElementById('loginPass');
    const toggle = document.getElementById('loginPassToggle');
    if (!input || !toggle) return;

    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    toggle.classList.toggle('is-visible', show);
    toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
};

function syncLoginFieldState(input) {
    const field = input.closest('.login-field');
    if (!field) return;
    field.classList.toggle('is-filled', input.value.length > 0);
}

function initLoginFields() {
    document.querySelectorAll('.login-field input').forEach((input) => {
        const sync = () => syncLoginFieldState(input);
        if (!input.dataset.loginFieldBound) {
            input.dataset.loginFieldBound = '1';
            input.addEventListener('focus', sync);
            input.addEventListener('input', sync);
            input.addEventListener('change', sync);
            input.addEventListener('blur', sync);
        }
        sync();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoginFields);
} else {
    initLoginFields();
}

window.addEventListener('load', initLoginFields);

window.handleRegister = async function (e) {
    e.preventDefault();

    // Same double-submission guard as login
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn.disabled) return;
    submitBtn.disabled = true;
    const originalLabel = submitBtn.innerText;
    submitBtn.innerText = 'Creating account...';

    const username = document.getElementById('regUser').value.trim().toLowerCase();
    const password = document.getElementById('regPass').value.trim();
    const confirm = document.getElementById('regPassConfirm').value.trim();

    try {
        if (password !== confirm) {
            showNotification('Error: Passwords do not match.', 'error');
            return;
        }

        if (password.length < PASSWORD_MIN_LENGTH) {
            showNotification(`Error: Password must be at least ${PASSWORD_MIN_LENGTH} characters.`, 'error');
            return;
        }

        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
            showNotification('Account registered! Pending staff approval.', 'success');
            e.target.reset();
            toggleAuthMode('login');
        } else if (response.status === 429) {
            showNotification('Too many registration attempts. Please wait a minute.', 'error');
        } else {
            const data = await response.json().catch(() => ({}));
            showNotification(data.message || 'Registration failed.', 'error');
        }
    } catch (err) {
        showNotification('Server connection error. Is Laravel running?', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalLabel;
    }
};

window.handleForgot = async function (e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn.disabled) return;
    submitBtn.disabled = true;
    const originalLabel = submitBtn.innerText;
    submitBtn.innerText = 'Sending request...';

    const username = document.getElementById('forgotUser').value.trim().toLowerCase();

    try {
        const response = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ username }),
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
            showNotification(data.message || 'If this account exists, visit the shop counter.', 'success');
            e.target.reset();
            toggleAuthMode('login');
        } else if (response.status === 429) {
            showNotification('Too many reset attempts. Please wait a minute.', 'error');
        } else {
            showNotification(data.message || 'Could not submit the reset request.', 'error');
        }
    } catch (err) {
        showNotification('Server connection error. Is Laravel running?', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalLabel;
    }
};

function showLoginLoader() {
    const el = document.getElementById('loginLoader');
    if (!el) return;
    el.classList.remove('hidden');
    el.setAttribute('aria-hidden', 'false');
}

function hideLoginLoader() {
    const el = document.getElementById('loginLoader');
    if (!el) return;
    el.classList.add('hidden');
    el.setAttribute('aria-hidden', 'true');
}

window.handleUnifiedLogin = async function (e) {
    e.preventDefault();

    // Prevent double submission (double-click or Enter + click): one request,
    // one welcome toast.
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn.disabled) return;
    submitBtn.disabled = true;
    const originalLabel = submitBtn.innerText;
    submitBtn.innerText = 'Logging in...';
    showLoginLoader();

    const username = document.getElementById('loginUser').value.trim().toLowerCase();
    const password = document.getElementById('loginPass').value.trim();
    const err = document.getElementById('loginError');
    err.classList.add('hidden');

    let greeting = null;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            err.classList.remove('hidden');
            err.innerText = response.status === 429
                ? 'Too many login attempts. Please wait a minute.'
                : (data.message || 'Invalid credentials.');
            return;
        }

        const data = await response.json();
        authToken = data.token;
        localStorage.setItem('mt_token', authToken);

        if (data.user.role === 'admin') {
            await loginSuccess(data.user.username, 'admin');
            greeting = 'Welcome back, Owner!';
        } else if (data.user.role === 'staff') {
            await loginSuccess(data.user.username, 'staff');
            greeting = 'Workspace accessed.';
        } else {
            await loginSuccess(data.user.username, 'customer');
            greeting = 'Welcome to your portal.';
        }
    } catch (error) {
        console.error('Login failed:', error);
        err.classList.remove('hidden');
        err.innerText = 'Server connection error.';
    } finally {
        hideLoginLoader();
        submitBtn.disabled = false;
        submitBtn.innerText = originalLabel;
    }

    if (greeting) showNotification(greeting, 'success');
};

function waitForPaint() {
    return new Promise(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
}

function clearWorkspaceState() {
    loadSequence += 1;
    syncedKeys.clear();
    dbUsers = [];
    dbJobs = [];
    dbReleased = [];
    dbInv = [];
    dbExpenses = [];
    dbResets = [];
    dbMechanics = [];
    dbCounterSales = [];
    notifUnreadCount = 0;
    notifItems = [];
    window.stopUsersPresencePoll?.();

    const nav = document.getElementById('sidebarNav');
    const content = document.getElementById('mainContentArea');
    const actions = document.getElementById('headerActions');
    const title = document.getElementById('pageTitle');
    const desc = document.getElementById('pageDesc');
    const badge = document.getElementById('notifBadge');
    const panel = document.getElementById('notifPanel');

    if (nav) nav.innerHTML = '';
    if (content) content.innerHTML = '';
    if (actions) actions.innerHTML = '';
    const pageToolbar = document.getElementById('pageToolbar');
    if (pageToolbar) pageToolbar.innerHTML = '';
    if (title) title.innerText = 'Dashboard';
    if (desc) {
        desc.innerText = '';
        desc.classList.remove('bj-crumbs');
    }
    if (badge) {
        badge.innerText = '0';
        badge.classList.add('hidden');
    }
    if (panel) {
        panel.innerHTML = '';
        panel.classList.add('hidden');
    }
    document.getElementById('notifBell')?.setAttribute('aria-expanded', 'false');
    window.closeFeedbackDrawer?.();
    window.closeProfileMenu?.();
    const profileAva = document.getElementById('profileAva');
    if (profileAva) {
        profileAva.textContent = '?';
        profileAva.classList.remove('is-online');
    }
    const profileName = document.getElementById('profileName');
    if (profileName) profileName.textContent = '';
    document.getElementById('profileBtn')?.setAttribute('aria-label', 'Account menu');
    const sidebarAva = document.getElementById('sidebarAva');
    if (sidebarAva) {
        sidebarAva.textContent = '?';
        sidebarAva.classList.remove('is-online');
    }
    const sidebarName = document.getElementById('sidebarUserName');
    if (sidebarName) sidebarName.textContent = '—';
    const sidebarRole = document.getElementById('sidebarUserRole');
    if (sidebarRole) sidebarRole.textContent = '—';
    document.getElementById('feedbackWrap')?.classList.add('hidden');
}

async function loginSuccess(userName, roleName) {
    currentUser = userName;
    currentRole = roleName;

    // Persist the session so it survives a page refresh
    localStorage.setItem('mt_session_user', userName);
    localStorage.setItem('mt_session_role', roleName);

    clearWorkspaceState();
    document.getElementById('displayRole').innerText = roleName.toUpperCase();
    restoreSidebarCollapse();

    // Keep the loader up while this role's first screen is built. Showing the
    // shell now lets charts measure, but leftover UI from the last account
    // is already gone.
    document.getElementById('view-login').classList.remove('active-view');
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-system').classList.remove('hidden');
    document.getElementById('view-system').classList.add('active-view');
    window.syncFeedbackAccess?.();
    window.paintProfile?.();

    await syncAllData();
    startNotifPolling();
    await buildSidebar();
    await waitForPaint();
    // Overview charts draw on a short timeout after the canvas is in the DOM.
    await new Promise(resolve => setTimeout(resolve, 80));
}

window.logout = function () {
    closeSidebar();
    openModal('modal-logout');
};

// User-initiated logout (the confirm modal's "Yes, Log out" button).
window.executeLogout = async function () {
    // Revoke the token server-side (best effort)
    try {
        if (authToken) {
            await fetch('/api/logout', {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${authToken}` },
            });
        }
    } catch (error) {
        console.error('Logout request failed:', error);
    }

    resetSession();
    showNotification('Logged out successfully!', 'success');
};

// Session-expiry path (called by apiFetch on 401): the token is already dead
// server-side, so skip the revoke call and show only the expiry message —
// not a misleading "Logged out successfully!".
window.forceLogout = function (message) {
    resetSession();
    showNotification(message, 'error');
};

// Clear the local session and return to the login screen.
function resetSession() {
    localStorage.removeItem('mt_session_user');
    localStorage.removeItem('mt_session_role');
    localStorage.removeItem('mt_token');
    stopNotifPolling();
    authToken = null;
    currentUser = null;
    currentRole = null;

    document.getElementById('view-system').classList.remove('active-view', 'page-backjobs', 'page-kanban');
    const hero = document.getElementById('pageHero');
    if (hero) {
        hero.innerHTML = '';
        hero.hidden = true;
    }
    const toolbar = document.getElementById('pageToolbar');
    if (toolbar) toolbar.innerHTML = '';
    document.getElementById('view-system').classList.add('hidden');
    document.getElementById('view-login').classList.remove('hidden');
    document.getElementById('view-login').classList.add('active-view');
    document.getElementById('mainLoginForm').reset();
    document.getElementById('loginError').classList.add('hidden');
    clearWorkspaceState();

    closeModal('modal-logout');
    closeSidebar();
}
