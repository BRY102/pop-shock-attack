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

window.searchBackjobsLive = function () {
    backjobSearch = document.getElementById('backjobSearchInput')?.value.trim() || '';
    renderBackjobResults();
};

window.clearBackjobSearch = function () {
    backjobSearch = '';
    refreshBackjobHeader();
    renderBackjobResults();
};

window.filterBackjobMechanic = function (name) {
    backjobMechanic = String(name || '').trim();
    backjobTab = 'claims';
    backjobFilterOpen = false;
    backjobSortOpen = false;
    renderBackjobResults();
};

window.clearBackjobMechanic = function () {
    backjobMechanic = '';
    backjobFilterOpen = false;
    backjobSortOpen = false;
    renderBackjobResults();
};

window.setBackjobStatus = function (status) {
    backjobStatus = backjobStatus === status ? 'all' : status;
    backjobTab = 'claims';
    backjobSortOpen = false;
    renderBackjobResults();
};

window.setBackjobTab = function (tab) {
    backjobTab = tab;
    backjobFilterOpen = false;
    backjobSortOpen = false;
    renderBackjobResults();
};

window.setBackjobSort = function (sort) {
    backjobSort = sort === 'oldest' ? 'oldest' : 'newest';
    backjobSortOpen = false;
    renderBackjobResults();
};

window.toggleBackjobFilter = function (event) {
    event?.stopPropagation();
    backjobFilterOpen = !backjobFilterOpen;
    backjobSortOpen = false;
    renderBackjobResults();
};

window.toggleBackjobSort = function (event) {
    event?.stopPropagation();
    backjobSortOpen = !backjobSortOpen;
    backjobFilterOpen = false;
    renderBackjobResults();
};

window.toggleBackjobRow = function (jobId) {
    const id = String(jobId);
    backjobOpenId = backjobOpenId === id ? null : id;
    renderBackjobResults();
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
            <div class="empty-state">
                <div class="empty-icon">${icon('rotate-ccw')}</div>
                <h3>No back-jobs yet</h3>
                <p>Warranty re-service claims will show up here after specs are logged.</p>
            </div>`;
        return;
    }

    const kpis = backjobKpis();
    const { jobs, counts } = filteredBackjobPool();

    content.innerHTML = `
        <div class="bj-page">
            ${backjobKpiHtml(kpis)}
            <div class="bj-toolbar">
                <div class="bj-filters" role="tablist" aria-label="Back-jobs filters">
                    <button type="button" class="bj-tab${backjobTab === 'claims' ? ' is-selected' : ''}"
                            onclick="setBackjobTab('claims')">Claims <strong>${counts.all}</strong></button>
                    <button type="button" class="bj-tab${backjobTab === 'mechanics' ? ' is-selected' : ''}"
                            onclick="setBackjobTab('mechanics')">By mechanic</button>
                    ${statusChip('open', 'Open', counts.open)}
                    ${statusChip('closed', 'Closed', counts.closed)}
                </div>
                <div class="bj-toolbar-actions">
                    ${sortControlHtml()}
                    ${filterControlHtml()}
                </div>
            </div>
            ${backjobTab === 'mechanics' ? mechanicPanelHtml(jobs) : claimsPanelHtml(jobs, counts)}
        </div>
    `;
}
