// ============================================================
// MotoTrack — View router
// buildSidebar() draws the role-based nav; loadView() syncs data
// then dispatches to one render function per view. The render
// functions live in the other files of this folder, one per view.
// ============================================================

const SIDEBAR_COLLAPSE_KEY = 'mt_sidebar_collapsed';

function isMobileNav() {
    return window.matchMedia('(max-width: 1024px)').matches;
}

function syncMenuToggle(open) {
    const toggle = document.getElementById('menuToggle');
    if (!toggle) return;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

function syncCollapseToggle() {
    const btn = document.getElementById('sidebarCollapse');
    const collapsed = document.getElementById('view-system')?.classList.contains('sidebar-collapsed');
    if (!btn) return;
    btn.setAttribute('aria-label', collapsed ? 'Expand menu' : 'Collapse menu');
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
}

function restoreSidebarCollapse() {
    const system = document.getElementById('view-system');
    if (!system) return;
    if (!isMobileNav() && localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1') {
        system.classList.add('sidebar-collapsed');
    }
    syncCollapseToggle();
}

window.toggleSidebarCollapse = function (e) {
    e?.stopPropagation();
    if (isMobileNav()) return;
    const system = document.getElementById('view-system');
    if (!system) return;
    const collapsed = !system.classList.contains('sidebar-collapsed');
    system.classList.toggle('sidebar-collapsed', collapsed);
    localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed ? '1' : '0');
    syncCollapseToggle();
    window.fitOverviewCharts?.();
};

window.closeSidebar = function () {
    const system = document.getElementById('view-system');
    const backdrop = document.getElementById('sidebarBackdrop');
    system?.classList.remove('sidebar-open');
    backdrop?.classList.add('hidden');
    syncMenuToggle(false);
};

window.openSidebar = function () {
    if (!isMobileNav()) return;
    const system = document.getElementById('view-system');
    const backdrop = document.getElementById('sidebarBackdrop');
    const notifPanel = document.getElementById('notifPanel');
    system?.classList.add('sidebar-open');
    backdrop?.classList.remove('hidden');
    notifPanel?.classList.add('hidden');
    window.closeFeedbackDrawer?.();
    syncMenuToggle(true);
};

window.toggleSidebar = function (e) {
    e?.stopPropagation();
    const system = document.getElementById('view-system');
    if (system?.classList.contains('sidebar-open')) {
        closeSidebar();
    } else {
        openSidebar();
    }
};

// Which screens each role gets, in menu order, with the icon that labels it.
const NAV_MENUS = {
    admin: [
        { view: 'overview', label: 'Overview', icon: 'layout-grid' },
        { view: 'kanban', label: 'Workflow', icon: 'wrench' },
        { view: 'history', label: 'Service History', icon: 'calendar-clock' },
        { view: 'inventory', label: 'Inventory', icon: 'package' },
        { view: 'reports', label: 'Sales', icon: 'banknote' },
        { view: 'backjobs', label: 'Back-jobs', icon: 'rotate-ccw' },
        { view: 'users', label: 'Manage Users', icon: 'users' },
    ],
    staff: [
        { view: 'kanban', label: 'Workflow', icon: 'wrench' },
        { view: 'history', label: 'Service History', icon: 'calendar-clock' },
        { view: 'backjobs', label: 'Back-jobs', icon: 'rotate-ccw' },
        { view: 'inventory', label: 'Inventory', icon: 'package' },
        { view: 'approvals', label: 'Pending Requests', icon: 'clipboard-list' },
    ],
    customer: [
        { view: 'customer', label: 'My Dashboard', icon: 'layout-grid' },
        { view: 'customer-prev', label: 'Previous jobs', icon: 'calendar-clock' },
    ],
};

async function buildSidebar() {
    const nav = document.getElementById('sidebarNav');
    nav.innerHTML = '';
    closeSidebar();

    const menu = NAV_MENUS[currentRole];
    if (!menu) return;

    nav.innerHTML = menu.map((entry, i) => `
        <li class="nav-item${i === 0 ? ' active' : ''}" data-view="${entry.view}"
            title="${esc(entry.label)}"
            onclick="loadView('${entry.view}')">
            ${icon(entry.icon)}<span>${esc(entry.label)}</span>
        </li>`).join('');

    await loadView(menu[0].view);
}

// The caches each view actually depends on. Navigation only waits for
// (and refreshes) these instead of re-fetching everything, and a view
// paints instantly whenever its caches are already synced.
const VIEW_DATA = {
    overview: ['jobs', 'released', 'expenses', 'inventory', 'counterSales'],
    approvals: ['users', 'resets'],
    reports: ['jobs', 'released', 'counterSales'],
    kanban: ['jobs', 'released', 'mechanics'],
    history: [], // searches on demand
    backjobs: ['jobs', 'released'],
    inventory: ['inventory'],
    users: ['users', 'resets', 'mechanics'],
    customer: ['jobs'],
    'customer-prev': ['jobs'],
};

const FETCHERS = {
    jobs: fetchJobsFromDatabase,
    released: fetchReleasedJobsFromDatabase,
    inventory: fetchInventoryFromDatabase,
    users: fetchUsersFromDatabase,
    expenses: fetchExpensesFromDatabase,
    counterSales: fetchCounterSalesFromDatabase,
    resets: fetchPasswordResetsFromDatabase,
    mechanics: fetchMechanicsFromDatabase,
};

// Ignore stale background refreshes after the user has navigated on
let loadSequence = 0;

window.loadView = async function (viewType) {
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.view === viewType);
    });
    closeSidebar();
    document.getElementById('view-system')?.classList.remove('header-compact');
    if (viewType !== 'kanban') window.pendingKanbanFocus = null;

    const renderers = {
        overview: renderOverview,
        approvals: renderApprovals,
        reports: renderReports,
        kanban: renderKanban,
        history: renderHistory,
        backjobs: renderBackjobs,
        inventory: renderInventory,
        users: renderUsers,
        customer: renderCustomerDashboard,
        'customer-prev': renderCustomerPrevious,
    };

    const render = renderers[viewType];
    if (!render) return;

    const ctx = {
        title: document.getElementById('pageTitle'),
        desc: document.getElementById('pageDesc'),
        actions: document.getElementById('headerActions'),
        content: document.getElementById('mainContentArea'),
    };
    ctx.desc?.classList.remove('bj-crumbs');

    const needs = VIEW_DATA[viewType] ?? [];
    const cacheReady = needs.every(key => syncedKeys.has(key));
    const CACHES = { jobs: () => dbJobs, released: () => dbReleased, inventory: () => dbInv, users: () => dbUsers, expenses: () => dbExpenses, counterSales: () => dbCounterSales, resets: () => dbResets, mechanics: () => dbMechanics };
    const snapshot = () => JSON.stringify(needs.map(key => CACHES[key]()));
    const sequence = ++loadSequence;

    // 1) Paint immediately from cache when we can — navigation feels instant
    if (cacheReady && sequence === loadSequence) {
        ctx.actions.innerHTML = '';
        render(ctx);
    }

    // 2) Refresh this view's data (plus notifications) in the background
    const before = cacheReady ? snapshot() : null;
    try {
        await Promise.all([...needs.map(key => FETCHERS[key]()), fetchNotifications()]);
    } catch (error) {
        console.error('Failed to sync data on navigation:', error);
    }

    // 3) Re-paint only if we haven't painted yet or the data actually changed,
    //    and only if the user hasn't already navigated somewhere else.
    if (sequence === loadSequence && (!cacheReady || snapshot() !== before)) {
        ctx.actions.innerHTML = '';
        render(ctx);
    }
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
});

window.addEventListener('resize', () => {
    if (!isMobileNav()) closeSidebar();
});
