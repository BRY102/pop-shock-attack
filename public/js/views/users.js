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
            <div class="approval-card">
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

function renderUsers(ctx) {
    ctx.title.innerText = 'Manage Users';
    ctx.desc.innerText = 'Accounts and mechanics.';
    ctx.actions.innerHTML = `<button class="btn btn-primary" onclick="openUserModal('add')">${icon('plus')} Add Account</button>`;

    let html = resetRequestCards();

    html += `<div class="table-container"><table class="data-table"><thead><tr><th>Username</th><th>Password</th><th>Role</th><th>Options</th></tr></thead><tbody>`;
    dbUsers.forEach(u => {
        const roleBadge = `<span class="badge-role ${esc(u.role)}">${u.role === 'admin' ? 'Admin' : (u.role === 'staff' ? 'Staff' : 'Customer')}</span>`;
        html += `<tr>
            <td>${esc(u.username)}</td>
            <td>***</td>
            <td>${roleBadge}</td>
            <td>
                <button class="btn-edit" onclick="openUserModal('edit', ${u.id})">Edit</button>
                <button class="btn-danger btn-sm" style="width:auto; margin-left:5px;" onclick="deleteUser(${u.id})">Delete</button>
            </td>
        </tr>`;
    });
    html += `</tbody></table></div>`;
    html += mechanicRoster();
    ctx.content.innerHTML = html;
}

function mechanicRoster() {
    let rows = '';
    if (dbMechanics.length === 0) {
        rows = `<tr><td colspan="2" style="text-align:center; padding: 1.5rem; color: #777;">No mechanics yet. Add a name so staff can assign jobs.</td></tr>`;
    } else {
        dbMechanics.forEach(m => {
            rows += `<tr>
                <td>${esc(m.name)}</td>
                <td><button class="btn-danger btn-sm" style="width:auto;" onclick="deleteMechanic(${m.id})">Remove</button></td>
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
        <div class="table-container table-compact"><table class="data-table"><thead><tr><th>Name</th><th>Options</th></tr></thead><tbody>${rows}</tbody></table></div>
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
}
