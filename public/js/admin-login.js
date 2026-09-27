// ============================================================
// MotoTrack — Dedicated Admin Portal Login
// Restricts authentication to users with role === 'admin'.
// ============================================================

function toggleAdminPassword() {
    const input = document.getElementById('adminPass');
    const toggle = document.getElementById('adminPassToggle');
    if (!input || !toggle) return;
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    toggle.classList.toggle('is-visible', isPass);
    toggle.setAttribute('aria-label', isPass ? 'Hide password' : 'Show password');
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const userField = document.getElementById('adminUser');
    const passField = document.getElementById('adminPass');
    const errorEl = document.getElementById('adminError');
    const submitBtn = document.getElementById('adminSubmitBtn');

    if (!userField || !passField) return;

    const username = userField.value.trim();
    const password = passField.value;

    if (errorEl) {
        errorEl.classList.add('hidden');
        errorEl.innerText = '';
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Verifying Credentials…';
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            const msg = data.message || 'Invalid administrator credentials.';
            showAdminError(msg);
            return;
        }

        const role = data.user?.role;

        // Strict role verification: only admin is authorized in this portal
        if (role !== 'admin') {
            // Revoke the issued token immediately so no session is held
            if (data.token) {
                fetch('/api/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${data.token}`,
                        'Accept': 'application/json',
                    }
                }).catch(() => {});
            }

            showAdminError('Access Denied: This portal is strictly restricted to Administrators. Staff and Customers must log in via the main portal.');
            return;
        }

        // Store authorized Admin session
        localStorage.setItem('mt_token', data.token);
        localStorage.setItem('mt_session_user', data.user.username);
        localStorage.setItem('mt_session_role', data.user.role);

        if (submitBtn) {
            submitBtn.innerText = 'Access Granted! Redirecting…';
            submitBtn.style.background = '#38a169';
        }

        // Redirect to system dashboard
        setTimeout(() => {
            window.location.href = '/';
        }, 600);

    } catch (err) {
        console.error('Admin login error:', err);
        showAdminError('Unable to connect to authentication service. Please check server.');
    } finally {
        if (submitBtn && submitBtn.innerText !== 'Access Granted! Redirecting…') {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Authenticate as Admin';
        }
    }
}

function showAdminError(msg) {
    const errorEl = document.getElementById('adminError');
    if (errorEl) {
        errorEl.innerText = msg;
        errorEl.classList.remove('hidden');
    }
}
