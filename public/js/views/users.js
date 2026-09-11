// ============================================================
// MotoTrack — Account management
// Admin: full user CRUD + pending password resets.
// Staff: pending customer approvals + password resets.
// ============================================================

function resetRequestCards() {
    if (dbResets.length === 0) return '';

    let cards = '';
    dbResets.forEach(r => {
        const requested = r.created_at
            ? `${new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${notifTimeAgo(r.created_at)}`
            : 'Date unavailable';

        cards += `
            <div class="approval-card" data-reset-user="${esc(r.username || '')}">
                <div class="avatar-circle">${esc((r.username || '?').charAt(0))}</div>
                <div class="approval-info">
                    <div class="username">${esc(r.username)}</div>
                    <div class="registered">${requested}</div>
                    <span class="badge-pending">PASSWORD RESET</span>
                </div>
                <button class="btn-sm btn-success" onclick="openResetModal(${r.id})">${icon('key')} Set Password</button>
            </div>`;
    });

    return `<div class="approval-section">
        <h3>Password reset requests</h3>
        <p class="approval-section-note">Set a temporary password and tell the rider at the counter.</p>
        <div class="approval-grid">${cards}</div>
    </div>`;
}

let usersPresenceTimer = null;
const USERS_PRESENCE_MS = 15000;

function userRoleLabel(role) {
    if (role === 'admin') return 'Admin';
    if (role === 'staff') return 'Staff';
    return 'Customer';
}

function userPresence(user) {
    if (user.status === 'pending') return 'pending';
    return user.online ? 'online' : 'offline';
}

function userStatusBadge(user) {
    const presence = userPresence(user);
    if (presence === 'pending') return '<span class="badge-pending">Pending</span>';
    if (presence === 'online') {
        return `<span class="users-presence"><span class="users-presence-dot is-live"></span><span class="badge-good">Active</span></span>`;
    }
    return `<span class="users-presence"><span class="users-presence-dot"></span><span class="badge-idle">Inactive</span></span>`;
}

function sortedUsers() {
    return [...dbUsers].sort((a, b) => {
        const rank = (u) => (userPresence(u) === 'online' ? 0 : (userPresence(u) === 'pending' ? 1 : 2));
        const byLive = rank(a) - rank(b);
        if (byLive) return byLive;
        return String(a.username).localeCompare(String(b.username));
    });
}

function userRowMenu(user) {
    return `
        <td class="row-menu-cell">
            <div class="row-menu-wrap">
                <button class="row-menu-btn" onclick="toggleRowMenu(event, 'user-${user.id}')"
                        aria-haspopup="true" aria-expanded="false" aria-label="Actions for ${esc(user.username)}">
                    ${icon('ellipsis')}
                </button>
                <div class="row-menu hidden" id="rowMenu-user-${user.id}" role="menu">
                    <button role="menuitem" onclick="closeRowMenus(); openUserModal('edit', ${user.id})">
                        ${icon('pencil')} Edit
                    </button>
                    <button role="menuitem" class="is-danger" onclick="closeRowMenus(); deleteUser(${user.id})">
                        ${icon('trash')} Delete
                    </button>
                </div>
            </div>
        </td>`;
}

function mechanicRowMenu(mechanic) {
    return `
        <td class="row-menu-cell">
            <div class="row-menu-wrap">
                <button class="row-menu-btn" onclick="toggleRowMenu(event, 'mech-${mechanic.id}')"
                        aria-haspopup="true" aria-expanded="false" aria-label="Actions for ${esc(mechanic.name)}">
                    ${icon('ellipsis')}
                </button>
                <div class="row-menu hidden" id="rowMenu-mech-${mechanic.id}" role="menu">
                    <button role="menuitem" class="is-danger" onclick="closeRowMenus(); deleteMechanic(${mechanic.id})">
                        ${icon('trash')} Remove
                    </button>
                </div>
            </div>
        </td>`;
}

function userTableRows() {
    const users = sortedUsers();
    if (users.length === 0) {
        return `<tr><td colspan="4" class="table-empty">No accounts yet.</td></tr>`;
    }

    return users.map((u) => {
        const roleBadge = `<span class="badge-role ${esc(u.role)}">${userRoleLabel(u.role)}</span>`;
        return `<tr>
            <td>${esc(u.username)}</td>
            <td>${userStatusBadge(u)}</td>
            <td>${roleBadge}</td>
            ${userRowMenu(u)}
        </tr>`;
    }).join('');
}

function refreshUsersList() {
    const body = document.getElementById('usersTableBody');
    if (!body) return;
    body.innerHTML = userTableRows();
}

function stopUsersPresencePoll() {
    if (usersPresenceTimer) {
        clearInterval(usersPresenceTimer);
        usersPresenceTimer = null;
    }
}

function startUsersPresencePoll() {
    stopUsersPresencePoll();
    usersPresenceTimer = setInterval(async () => {
        if (!document.getElementById('usersTableBody')) {
            stopUsersPresencePoll();
            return;
        }
        if (document.querySelector('.row-menu-btn[aria-expanded="true"]')) return;
        await fetchUsersFromDatabase();
        refreshUsersList();
    }, USERS_PRESENCE_MS);
}

window.stopUsersPresencePoll = stopUsersPresencePoll;

function renderUsers(ctx) {
    ctx.title.innerText = 'Manage Users';
    ctx.desc.innerText = 'Accounts and mechanics.';
    ctx.actions.innerHTML = `<button class="btn btn-primary" onclick="openUserModal('add')">${icon('plus')} Add Account</button>`;

    let html = resetRequestCards();
    html += `<div class="table-container"><table class="data-table"><thead><tr>
        <th>Username</th><th>Status</th><th>Role</th>
        <th><span class="sr-only">Actions</span></th>
    </tr></thead><tbody id="usersTableBody">${userTableRows()}</tbody></table></div>`;
    html += mechanicRoster();
    ctx.content.innerHTML = html;
    focusPendingResetCard();
    startUsersPresencePoll();
}

function mechanicRoster() {
    let rows = '';
    if (dbMechanics.length === 0) {
        rows = `<tr><td colspan="2" style="text-align:center; padding: 1.5rem; color: #777;">No mechanics yet. Add a name so staff can assign jobs.</td></tr>`;
    } else {
        dbMechanics.forEach((m) => {
            rows += `<tr>
                <td>${esc(m.name)}</td>
                ${mechanicRowMenu(m)}
            </tr>`;
        });
    }

    return `<div class="approval-section" style="margin-top:2rem;">
        <h3>Shop mechanics</h3>
        <p class="approval-section-note">Names used when assigning a job.</p>
        <form onsubmit="submitMechanic(event)" class="inline-form">
            <input type="text" id="m_mechanic_name" class="search-bar" placeholder="Mechanic name" required minlength="2" maxlength="100">
            <button type="submit" class="btn btn-primary">${icon('plus')} Add Mechanic</button>
        </form>
        <div class="table-container table-compact"><table class="data-table"><thead><tr>
            <th>Name</th><th><span class="sr-only">Actions</span></th>
        </tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;
}

function renderApprovals(ctx) {
    const pendingUsers = dbUsers.filter(u => u.status === 'pending');
    const waiting = pendingUsers.length + dbResets.length;

    ctx.title.innerText = 'Requests';
    ctx.desc.innerText = waiting === 0
        ? 'New sign-ups and password resets'
        : `${waiting} request${waiting === 1 ? '' : 's'} waiting`;

    if (waiting === 0) {
        ctx.content.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">${icon('inbox')}</div>
                <h3>Nothing pending</h3>
                <p>New sign-ups and resets show up here.</p>
            </div>`;
        return;
    }

    let html = resetRequestCards();

    if (pendingUsers.length > 0) {
        let cards = '';
        pendingUsers.forEach(u => {
            const registered = u.created_at
                ? `${new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${notifTimeAgo(u.created_at)}`
                : 'Date unavailable';

            cards += `
                <div class="approval-card">
                    <div class="avatar-circle">${esc(u.username.charAt(0))}</div>
                    <div class="approval-info">
                        <div class="username">${esc(u.username)}</div>
                        <div class="registered">${registered}</div>
                        <span class="badge-pending">PENDING APPROVAL</span>
                    </div>
                    <button class="btn-sm btn-success" onclick="approveUser(${u.id})">${icon('check')} Approve</button>
                </div>`;
        });

        html += `<div class="approval-section">
            <h3>New registrations</h3>
            <div class="approval-grid">${cards}</div>
        </div>`;
    }

    ctx.content.innerHTML = html;
    focusPendingResetCard();
}

function focusPendingResetCard() {
    const name = window.pendingResetUsername;
    if (!name) return;
    const card = [...document.querySelectorAll('.approval-card[data-reset-user]')]
        .find(el => el.dataset.resetUser === name);
    if (!card) return;
    card.classList.add('is-focus');
    card.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
