// ============================================================
// MotoTrack — Back-jobs render
// Data and panels live in backjobs-*.js next to this file.
// Loaded after those. Behavior unchanged.
// ============================================================

async function loadBackjobs() {
    const content = document.getElementById('mainContentArea');

    try {
        const response = await apiFetch('/api/jobs/backjobs');
        if (!response.ok) {
            showNotification('Could not load back-jobs.', 'error');
            return;
        }
        backjobRows = sortBackjobs(await response.json());
        renderBackjobResults();
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
        if (content) {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">${icon('rotate-ccw')}</div>
                    <h3>Could not load back-jobs</h3>
                    <p>Check the connection and try again.</p>
                </div>`;
        }
    }
}

function renderBackjobs(ctx) {
    ctx.title.innerText = 'Back-jobs';
    ctx.desc.innerText = 'Open warranty claims first. Click a row to expand the job.';
    ctx.desc.classList.remove('bj-crumbs');
    ctx.actions.innerHTML = backjobHeaderHtml();

    ctx.content.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">${icon('rotate-ccw')}</div>
            <h3>Loading back-jobs…</h3>
        </div>
    `;

    loadBackjobs();
}

function refreshBackjobTable() {
    const host = document.getElementById('bjTableHost');
    if (!host) {
        renderBackjobResults();
        return;
    }
    const { jobs, counts } = filteredBackjobPool();
    host.innerHTML = backjobTableHtml(jobs, counts);
}

window.searchBackjobsLive = function () {
    backjobSearch = document.getElementById('backjobSearchInput')?.value.trim() || '';
    refreshBackjobTable();
};

window.clearBackjobSearch = function () {
    backjobSearch = '';
    const input = document.getElementById('backjobSearchInput');
    if (input) input.value = '';
    refreshBackjobHeader();
    renderBackjobResults();
};

window.filterBackjobMechanic = function (name) {
    backjobMechanic = String(name || '').trim();
    backjobTab = 'claims';
    if (typeof closeBackjobMenus === 'function') closeBackjobMenus();
    renderBackjobResults();
};

window.clearBackjobMechanic = function () {
    backjobMechanic = '';
    if (typeof closeBackjobMenus === 'function') closeBackjobMenus();
    renderBackjobResults();
};

window.setBackjobStatus = function (status) {
    backjobStatus = backjobStatus === status ? 'all' : status;
    backjobTab = 'claims';
    if (typeof closeBackjobMenus === 'function') closeBackjobMenus();
    renderBackjobResults();
};

window.setBackjobTab = function (tab) {
    backjobTab = tab;
    if (typeof closeBackjobMenus === 'function') closeBackjobMenus();
    renderBackjobResults();
};

window.setBackjobSort = function (sort) {
    backjobSort = sort === 'oldest' ? 'oldest' : 'newest';
    if (typeof closeBackjobMenus === 'function') closeBackjobMenus();
    renderBackjobResults();
};

window.closeBackjobMenus = function () {
    document.querySelectorAll('.bj-filters-bar .wrn-select-wrap.is-open').forEach((wrap) => {
        wrap.classList.remove('is-open');
        wrap.querySelector('.wrn-select')?.setAttribute('aria-expanded', 'false');
        wrap.querySelector('.wrn-menu')?.remove();
    });
};

window.toggleBackjobMenu = function (e, kind) {
    e.preventDefault();
    e.stopPropagation();
    const wrap = e.currentTarget.closest('.wrn-select-wrap');
    if (!wrap) return;
    const wasOpen = wrap.classList.contains('is-open');
    if (typeof closeWarrantyMenus === 'function') closeWarrantyMenus();
    closeBackjobMenus();
    if (wasOpen) return;
    wrap.classList.add('is-open');
    e.currentTarget.setAttribute('aria-expanded', 'true');
    wrap.insertAdjacentHTML('beforeend', backjobMenuHtml(kind));
};

window.pickBackjobFilter = function (kind, value) {
    if (kind === 'view') backjobTab = value === 'mechanics' ? 'mechanics' : 'claims';
    if (kind === 'status') backjobStatus = value || 'all';
    if (kind === 'sort') backjobSort = value === 'oldest' ? 'oldest' : 'newest';
    if (kind === 'mechanic') backjobMechanic = !value || value === 'all' ? '' : String(value);
    closeBackjobMenus();
    renderBackjobResults();
};

window.toggleBackjobRow = function (jobId) {
    const id = String(jobId);
    backjobOpenId = backjobOpenId === id ? null : id;
    refreshBackjobTable();
};

window.openBackjob = function (jobId) {
    const job = backjobRows.find(row => String(row.id) === String(jobId));
    if (!job) return;
    const onBoard = dbJobs.some(row => String(row.id) === String(job.id) && isOpenClaim(row));
    if (onBoard) {
        window.pendingKanbanFocus = { id: String(job.id), plate: job.plate_number || '' };
        loadView('kanban');
        return;
    }
    const plate = String(job.plate_number || '').trim();
    if (plate.length < 2) {
        showNotification('This job has no plate to look up.', 'error');
        return;
    }
    window.pendingHistoryQuery = plate;
    loadView('history');
};

window.logBackjobClaim = function () {
    if (currentRole !== 'staff') return;
    openIntake();
};

function renderBackjobResults() {
    const content = document.getElementById('mainContentArea');
    if (!content) return;

    if (backjobRows.length === 0) {
        content.innerHTML = `
            <div class="bj-page">
                ${backjobFiltersHtml()}
                <div class="empty-state">
                    <div class="empty-icon">${icon('rotate-ccw')}</div>
                    <h3>No back-jobs yet</h3>
                    <p>Warranty re-service claims will show up here after specs are logged.</p>
                </div>
            </div>`;
        return;
    }

    const kpis = backjobKpis();
    const { jobs, counts } = filteredBackjobPool();

    content.innerHTML = `
        <div class="bj-page">
            ${backjobKpiHtml(kpis)}
            ${backjobFiltersHtml()}
            <div id="bjTableHost">
                ${backjobTableHtml(jobs, counts)}
            </div>
        </div>
    `;
}
