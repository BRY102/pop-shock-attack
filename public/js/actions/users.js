// ============================================================
// MotoTrack — User and mechanic actions
// Split from actions.js. Behavior unchanged.
// ============================================================

// ------------------------------------------------------------
// User accounts
// ------------------------------------------------------------
window.toggleUserPassword = function () {
    const input = document.getElementById('m_password');
    const toggle = document.getElementById('userPassToggle');
    if (!input || !toggle) return;

    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    toggle.classList.toggle('is-visible', show);
    toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
};

function resetUserPasswordToggle() {
    const input = document.getElementById('m_password');
    const toggle = document.getElementById('userPassToggle');
    if (input) input.type = 'password';
    toggle?.classList.remove('is-visible');
    toggle?.setAttribute('aria-label', 'Show password');
}

function syncUserRoleLabel() {
    const select = document.getElementById('m_role');
    const label = document.getElementById('m_role_label');
    if (!select || !label) return;
    const opt = select.options[select.selectedIndex];
    label.textContent = opt ? opt.text : select.value;
    document.querySelectorAll('#m_role_menu .user-edit-role-option').forEach((btn) => {
        const on = btn.dataset.value === select.value;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
}

window.pickUserRole = function (e) {
    e.preventDefault();
    e.stopPropagation();
    const select = document.getElementById('m_role');
    if (!select) return;
    select.value = e.currentTarget.dataset.value;
    syncUserRoleLabel();
    closeUserRoleMenu();
};

window.closeUserRoleMenu = function () {
    const menu = document.getElementById('m_role_menu');
    const btn = document.getElementById('m_role_btn');
    menu?.classList.add('hidden');
    btn?.setAttribute('aria-expanded', 'false');
    btn?.classList.remove('is-open');
};

window.toggleUserRoleMenu = function (e) {
    e.preventDefault();
    e.stopPropagation();
    const menu = document.getElementById('m_role_menu');
    const btn = document.getElementById('m_role_btn');
    if (!menu || !btn) return;

    const isOpen = !menu.classList.contains('hidden');
    closeUserRoleMenu();
    if (isOpen) return;

    menu.classList.remove('hidden');
    btn.setAttribute('aria-expanded', 'true');
    btn.classList.add('is-open');
};

document.addEventListener('click', (e) => {
    if (!e.target.closest?.('.user-edit-dropdown')) closeUserRoleMenu();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeUserRoleMenu();
});

window.openUserModal = function (mode, id = null) {
    document.getElementById('edit_user_mode').value = mode;
    const form = document.getElementById('modal-manage-user').querySelector('form');
    const passwordInput = document.getElementById('m_password');
    const requiredMark = document.getElementById('userPasswordRequired');
    const hint = document.getElementById('userPasswordHint');
    const saveLabel = document.getElementById('userEditSaveLabel');

    paintSheetIcons();
    resetUserPasswordToggle();
    closeUserRoleMenu();

    if (mode === 'add') {
        document.getElementById('userModalTitle').innerText = 'Add User';
        document.getElementById('userModalSub').innerText = 'Create a new shop account.';
        form.reset();
        passwordInput.required = true;
        passwordInput.placeholder = `Minimum ${PASSWORD_MIN_LENGTH} characters`;
        requiredMark?.classList.remove('hidden');
        if (hint) hint.textContent = `Minimum ${PASSWORD_MIN_LENGTH} characters.`;
        if (saveLabel) saveLabel.textContent = 'Save Account';
        syncUserRoleLabel();
    } else {
        document.getElementById('userModalTitle').innerText = 'Edit User';
        document.getElementById('userModalSub').innerText = "Update this account's details.";
        const user = dbUsers.find(u => u.id === id);

        if (!user) {
            showNotification('Error: Could not load user data.', 'error');
            return;
        }

        document.getElementById('edit_user_id').value = user.id;
        document.getElementById('m_username').value = user.username;
        // Hashes are never sent to the browser; blank means "keep current password"
        passwordInput.value = '';
        passwordInput.required = false;
        passwordInput.placeholder = 'Leave blank to keep current password';
        requiredMark?.classList.add('hidden');
        if (hint) hint.textContent = 'Leave blank to keep the current password.';
        document.getElementById('m_role').value = user.role;
        if (saveLabel) saveLabel.textContent = 'Save Changes';
        syncUserRoleLabel();
    }

    openModal('modal-manage-user');
};

window.submitUserForm = async function (e) {
    e.preventDefault();
    const mode = document.getElementById('edit_user_mode').value;
    const username = document.getElementById('m_username').value.trim().toLowerCase();
    const password = document.getElementById('m_password').value;
    const role = document.getElementById('m_role').value;

    if (password && password.length < PASSWORD_MIN_LENGTH) {
        showNotification(`Error: Password must be at least ${PASSWORD_MIN_LENGTH} characters.`, 'error');
        return;
    }

    try {
        let response;
        if (mode === 'add') {
            response = await apiFetch('/api/users', {
                method: 'POST',
                body: JSON.stringify({ username, password, role }),
            });
        } else {
            const id = document.getElementById('edit_user_id').value;
            const payload = { username, role };
            if (password) payload.password = password;

            response = await apiFetch(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        }

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to save user.');
        }

        closeModal('modal-manage-user');
        showNotification('User saved to database.', 'success');
        invalidate('users');
        await loadView('users');
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
};

window.deleteUser = async function (id) {
    const user = dbUsers.find(u => u.id === id);
    const username = user ? user.username : 'this user';

    if (username === 'admin') {
        showNotification('Cannot delete main admin.', 'error');
        return;
    }
    if (!confirm(`Delete user ${username}?`)) return;

    try {
        const response = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });

        if (response.ok) {
            showNotification('User deleted.', 'success');
            invalidate('users');
        await loadView('users');
        } else {
            const data = await response.json().catch(() => ({}));
            showNotification(data.message || 'Error deleting user.', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};

window.openResetModal = function (id) {
    const reset = dbResets.find(r => r.id === id);
    if (!reset) {
        showNotification('Error: Could not load the reset request.', 'error');
        return;
    }

    document.getElementById('reset_request_id').value = reset.id;
    document.getElementById('reset_username').value = reset.username;
    document.getElementById('reset_password').value = '';
    document.getElementById('reset_password_confirm').value = '';
    openModal('modal-reset-password');
};

window.submitPasswordReset = async function (e) {
    e.preventDefault();

    const id = document.getElementById('reset_request_id').value;
    const password = document.getElementById('reset_password').value;
    const confirm = document.getElementById('reset_password_confirm').value;

    if (password !== confirm) {
        showNotification('Error: Passwords do not match.', 'error');
        return;
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
        showNotification(`Error: Password must be at least ${PASSWORD_MIN_LENGTH} characters.`, 'error');
        return;
    }

    try {
        const response = await apiFetch(`/api/password-resets/${id}/complete`, {
            method: 'PUT',
            body: JSON.stringify({ password }),
        });

        if (!response.ok) {
            showNotification(await serverMessage(response, 'Could not reset the password.'), 'error');
            return;
        }

        closeModal('modal-reset-password');
        showNotification('Password reset. Tell the rider the new password at the counter.', 'success');
        invalidate('resets');
        await loadView(currentRole === 'admin' ? 'users' : 'approvals');
    } catch (error) {
        showNotification('Server connection error.', 'error');
    }
};

window.submitMechanic = async function (e) {
    e.preventDefault();
    const name = document.getElementById('m_mechanic_name').value.trim();
    if (!name) return;

    try {
        const response = await apiFetch('/api/mechanics', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });

        if (!response.ok) {
            showNotification(await serverMessage(response, 'Could not add the mechanic.'), 'error');
            return;
        }

        e.target.reset();
        showNotification('Mechanic added. Staff can assign this name on the board.', 'success');
        invalidate('mechanics');
        await loadView('users');
    } catch (error) {
        showNotification('Server connection error.', 'error');
    }
};

window.deleteMechanic = async function (id) {
    const mechanic = dbMechanics.find(m => m.id === id);
    const name = mechanic ? mechanic.name : 'this mechanic';
    if (!confirm(`Remove ${name} from the assignment list?`)) return;

    try {
        const response = await apiFetch(`/api/mechanics/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showNotification('Mechanic removed.', 'success');
            invalidate('mechanics');
            await loadView('users');
        } else {
            showNotification(await serverMessage(response, 'Could not remove the mechanic.'), 'error');
        }
    } catch (error) {
        showNotification('Server connection error.', 'error');
    }
};

window.approveUser = async function (id) {
    try {
        const response = await apiFetch(`/api/users/${id}/approve`, { method: 'PUT' });

        if (response.ok) {
            showNotification('Account approved!', 'success');
            invalidate('users');
            await loadView('approvals');
        } else {
            showNotification('Error approving user.', 'error');
        }
    } catch (error) {
        showNotification('Server connection error.', 'error');
    }
};
