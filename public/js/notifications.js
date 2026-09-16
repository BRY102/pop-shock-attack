// ============================================================
// MotoTrack — Notification bell
// Stage changes, low stock, and password-reset requests.
// Opening the panel does not mark them read; clicking one does,
// and jumps to the matching screen.
// ============================================================

let notifUnreadCount = 0;
let notifItems = [];
let notifPollTimer = null;
const NOTIF_POLL_MS = 45000;

const NOTIF_KINDS = {
    job: { label: 'Job', icon: 'wrench' },
    stock: { label: 'Stock', icon: 'package' },
    reset: { label: 'Reset', icon: 'key' },
};

function notifKind(n) {
    const data = n?.data || {};
    if (data.type === 'low_stock' || data.item_id) return 'stock';
    if (data.type === 'password_reset' || (data.user_id && data.username && !data.job_id)) return 'reset';
    return 'job';
}

function isNotifUnread(n) {
    if (typeof n?.unread === 'boolean') return n.unread;
    return n?.read_at == null || n.read_at === '';
}

function closeNotifPanel() {
    const panel = document.getElementById('notifPanel');
    const bell = document.getElementById('notifBell');
    panel?.classList.add('hidden');
    bell?.setAttribute('aria-expanded', 'false');
}

window.closeNotifPanel = closeNotifPanel;

function isNotifPanelOpen() {
    const panel = document.getElementById('notifPanel');
    return Boolean(panel && !panel.classList.contains('hidden'));
}

async function fetchNotifications() {
    if (!authToken || !currentRole) return;

    try {
        const response = await apiFetch('/api/notifications');
        if (!response.ok) return;

        const data = await response.json();
        notifUnreadCount = data.unread_count;
        notifItems = data.notifications;
        renderNotifBadge();
        renderNotifPanel();
    } catch (error) {
        console.error('Failed to pull notifications:', error);
    }
}

function renderNotifBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    badge.innerText = notifUnreadCount > 9 ? '9+' : notifUnreadCount;
    badge.classList.toggle('hidden', notifUnreadCount === 0);
}

// "3m ago" / "2h ago" / "Jul 6" relative timestamps for the panel
function notifTimeAgo(isoString) {
    const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return new Date(isoString).toLocaleString('en-US', { month: 'short', day: 'numeric' });
}

function renderNotifPanel() {
    const panel = document.getElementById('notifPanel');
    if (!panel) return;

    if (notifItems.length === 0) {
        panel.innerHTML = `<div class="notif-empty">No notifications yet.</div>`;
        return;
    }

    const unread = notifUnreadCount;
    const title = unread > 0
        ? `Notifications <span class="notif-count">${unread} new</span>`
        : 'Notifications';
    const markAll = unread > 0
        ? `<button type="button" class="notif-mark-all" onclick="markAllNotificationsRead(event)">Mark all as read</button>`
        : '';

    let html = `<div class="notif-header"><span class="notif-header-title">${title}</span>${markAll}</div>`;
    notifItems.forEach(n => {
        const unreadItem = isNotifUnread(n);
        const kind = notifKind(n);
        const meta = NOTIF_KINDS[kind] || NOTIF_KINDS.job;
        html += `<button type="button" class="notif-item${unreadItem ? ' unread' : ''}"
                    onclick="openNotification('${esc(n.id)}')">
            <div class="notif-item-top">
                <span class="notif-kind notif-kind-${kind}">${icon(meta.icon)} ${meta.label}</span>
                <span class="notif-time">${notifTimeAgo(n.created_at)}</span>
            </div>
            <div class="notif-item-body">
                <div class="notif-message">${esc(n.data?.message || '')}</div>
                ${unreadItem ? '<span class="notif-unread-dot" aria-label="Unread"></span>' : ''}
            </div>
        </button>`;
    });
    panel.innerHTML = html;
}

window.toggleNotifPanel = async function () {
    const panel = document.getElementById('notifPanel');
    const bell = document.getElementById('notifBell');
    if (!panel) return;

    const opening = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !opening);
    bell?.setAttribute('aria-expanded', opening ? 'true' : 'false');
    if (opening) {
        window.closeFeedbackDrawer?.();
        window.closeProfileMenu?.();
        renderNotifPanel();
    }
};

function markNotifReadLocal(id) {
    const item = notifItems.find(n => n.id === id);
    if (!item || !isNotifUnread(item)) return false;
    item.read_at = new Date().toISOString();
    item.unread = false;
    notifUnreadCount = Math.max(0, notifUnreadCount - 1);
    renderNotifBadge();
    return true;
}

window.markAllNotificationsRead = async function (e) {
    e?.stopPropagation();
    if (notifUnreadCount === 0) return;

    notifItems = notifItems.map(n => ({
        ...n,
        read_at: n.read_at || new Date().toISOString(),
        unread: false,
    }));
    notifUnreadCount = 0;
    renderNotifBadge();
    renderNotifPanel();

    try {
        await apiFetch('/api/notifications/mark-read', { method: 'PUT' });
    } catch (error) {
        console.error('Failed to mark notifications read:', error);
    }
};

async function persistNotifRead(id) {
    try {
        await apiFetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PUT' });
    } catch (error) {
        console.error('Failed to mark notification read:', error);
    }
}

function openNotifDestination(item) {
    const kind = notifKind(item);
    const data = item.data || {};

    if (kind === 'stock') {
        if (currentRole === 'customer') return;
        const stock = Number(data.stock);
        const threshold = Number(data.threshold);
        inventoryFilter = stock === 0 ? 'out' : (stock <= threshold && stock > 0 ? 'low' : 'all');
        inventorySearch = data.item_name || '';
        window.pendingInventoryFocus = { id: String(data.item_id || '') };
        loadView('inventory');
        return;
    }

    if (kind === 'reset') {
        if (currentRole === 'customer') return;
        window.pendingResetUsername = data.username || '';
        loadView(currentRole === 'admin' ? 'users' : 'approvals');
        return;
    }

    const jobId = data.job_id != null ? String(data.job_id) : '';
    const plate = data.plate_number || '';

    if (currentRole === 'customer') {
        window.pendingCustomerJobId = jobId;
        loadView('customer');
        return;
    }

    if (data.stage === 'Release') {
        window.pendingHistoryQuery = plate;
        loadView('history');
        return;
    }

    window.pendingKanbanFocus = { id: jobId, plate };
    loadView('kanban');
}

window.openNotification = async function (id) {
    const item = notifItems.find(n => n.id === id);
    closeNotifPanel();
    if (!item) return;

    const wasUnread = markNotifReadLocal(id);
    if (wasUnread) await persistNotifRead(id);

    openNotifDestination(item);
};

function startNotifPolling() {
    stopNotifPolling();
    notifPollTimer = setInterval(() => {
        if (!authToken || !currentRole) {
            stopNotifPolling();
            return;
        }
        fetchNotifications();
    }, NOTIF_POLL_MS);
}

function stopNotifPolling() {
    if (notifPollTimer) {
        clearInterval(notifPollTimer);
        notifPollTimer = null;
    }
}

// Clicking anywhere outside the bell closes the panel
document.addEventListener('click', (e) => {
    const wrap = document.getElementById('notifWrap');
    if (wrap && !wrap.contains(e.target)) closeNotifPanel();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isNotifPanelOpen()) closeNotifPanel();
});
