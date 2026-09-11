// ============================================================
// MotoTrack — API layer
// Central fetch wrapper (attaches the Sanctum bearer token) and
// the data-sync functions that refresh the local caches.
// ============================================================

async function apiFetch(url, options = {}) {
    const headers = Object.assign(
        {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        options.headers || {},
        authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
    );

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 && authToken) {
        // The token was revoked server-side. Reset the session exactly once —
        // syncAllData() fires several requests in parallel, and without the
        // authToken guard each stale 401 would pop its own pair of toasts.
        forceLogout('Session expired. Please log in again.');
    }

    return response;
}

// A failed refresh used to be console-only, so a view would paint an empty
// cache and read as "nothing in the shop" instead of "the server is
// unreachable". One shared message keeps parallel failures to a single toast,
// since showNotification() drops duplicates that are still on screen.
function reportSyncFailure(response) {
    // A 401 has already reset the session and shown its own message.
    if (response && response.status === 401) return;

    showNotification('Could not load the latest data from the server.', 'error');
}

// Which caches hold data we have fetched at least once this session.
// Views render instantly from a synced cache; a mutation calls
// invalidate() so the next view paint waits for fresh data instead
// of flashing a stale state.
const syncedKeys = new Set();

function invalidate(key) {
    syncedKeys.delete(key);
}

function allShopJobs() {
    return dbJobs.concat(dbReleased);
}

async function fetchJobsFromDatabase() {
    try {
        // Customers see every visit of theirs; shop staff see the floor only.
        const endpoint = currentRole === 'customer' ? '/api/my-jobs' : '/api/jobs';
        const response = await apiFetch(endpoint);
        if (!response.ok) {
            reportSyncFailure(response);
            return;
        }
        dbJobs = await response.json();
        syncedKeys.add('jobs');
    } catch (error) {
        console.error('Failed to pull live jobs:', error);
        reportSyncFailure(null);
    }
}

async function fetchReleasedJobsFromDatabase() {
    if (currentRole === 'customer') { syncedKeys.add('released'); return; }
    try {
        const response = await apiFetch('/api/jobs/released');
        if (!response.ok) {
            reportSyncFailure(response);
            return;
        }
        dbReleased = await response.json();
        syncedKeys.add('released');
    } catch (error) {
        console.error('Failed to pull released jobs:', error);
        reportSyncFailure(null);
    }
}

async function fetchInventoryFromDatabase() {
    if (currentRole === 'customer') { syncedKeys.add('inventory'); return; } // no inventory access
    try {
        const response = await apiFetch('/api/inventory');
        if (!response.ok) {
            reportSyncFailure(response);
            return;
        }
        dbInv = await response.json();
        syncedKeys.add('inventory');
    } catch (error) {
        console.error('Failed to pull live inventory:', error);
        reportSyncFailure(null);
    }
}

async function fetchUsersFromDatabase() {
    if (currentRole === 'customer') { syncedKeys.add('users'); return; } // no user-management access
    try {
        const response = await apiFetch('/api/users');
        if (!response.ok) {
            reportSyncFailure(response);
            return;
        }
        dbUsers = await response.json();
        syncedKeys.add('users');
    } catch (error) {
        console.error('Failed to pull users from database:', error);
        reportSyncFailure(null);
    }
}

async function fetchPasswordResetsFromDatabase() {
    if (currentRole === 'customer') { syncedKeys.add('resets'); return; }
    try {
        const response = await apiFetch('/api/password-resets');
        if (!response.ok) {
            reportSyncFailure(response);
            return;
        }
        dbResets = await response.json();
        syncedKeys.add('resets');
    } catch (error) {
        console.error('Failed to pull password reset requests:', error);
        reportSyncFailure(null);
    }
}

async function fetchMechanicsFromDatabase() {
    if (currentRole === 'customer') { syncedKeys.add('mechanics'); return; }
    try {
        const response = await apiFetch('/api/mechanics');
        if (!response.ok) {
            reportSyncFailure(response);
            return;
        }
        dbMechanics = await response.json();
        syncedKeys.add('mechanics');
    } catch (error) {
        console.error('Failed to pull mechanics:', error);
        reportSyncFailure(null);
    }
}

async function fetchExpensesFromDatabase() {
    if (currentRole === 'customer') { syncedKeys.add('expenses'); return; } // no expense access
    try {
        const response = await apiFetch('/api/expenses');
        if (!response.ok) {
            reportSyncFailure(response);
            return;
        }

        // Normalize backend field names to the shape the dashboard math expects.
        const rows = await response.json();
        dbExpenses = rows.map(exp => ({
            id: exp.id,
            desc: exp.description,
            category: exp.category || 'Miscellaneous',
            amount: Number(exp.amount),
            date: exp.date,
        }));
        syncedKeys.add('expenses');
    } catch (error) {
        console.error('Failed to pull live expenses:', error);
        reportSyncFailure(null);
    }
}

// Counter sales are owner-only bookkeeping, so every other role keeps an empty
// cache instead of firing a request the API would reject.
async function fetchCounterSalesFromDatabase() {
    if (currentRole !== 'admin') { syncedKeys.add('counterSales'); return; }
    try {
        const response = await apiFetch('/api/counter-sales');
        if (!response.ok) {
            reportSyncFailure(response);
            return;
        }

        const rows = await response.json();
        dbCounterSales = rows.map(sale => ({
            id: sale.id,
            desc: sale.description,
            amount: Number(sale.amount),
            date: sale.date,
        }));
        syncedKeys.add('counterSales');
    } catch (error) {
        console.error('Failed to pull counter sales:', error);
        reportSyncFailure(null);
    }
}

// Refresh every cache the current role has access to (login warm-up).
async function syncAllData() {
    await Promise.all([
        fetchJobsFromDatabase(),
        fetchInventoryFromDatabase(),
        fetchUsersFromDatabase(),
        fetchExpensesFromDatabase(),
        fetchCounterSalesFromDatabase(),
        fetchPasswordResetsFromDatabase(),
        fetchMechanicsFromDatabase(),
        fetchNotifications(),
    ]);
}
