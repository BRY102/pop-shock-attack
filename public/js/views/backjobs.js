// ============================================================
// MotoTrack — Back-jobs (admin / staff)
// Open warranty claims first. Click a row to open the job.
// Mechanic stats sit on a second tab, not beside the list.
// ============================================================

let backjobRows = [];
let backjobSearch = '';
let backjobMechanic = '';
let backjobStatus = 'open';
let backjobTab = 'claims';
let backjobOpenId = null;

function mechanicKey(job) {
    return (job.mechanic_name || '').trim() || 'Unassigned';
}

function isOpenClaim(job) {
    return job.stage !== 'Release';
}

function sortBackjobs(jobs) {
    return [...jobs].sort((a, b) => {
        const openDelta = Number(isOpenClaim(b)) - Number(isOpenClaim(a));
        if (openDelta !== 0) return openDelta;
        const byDate = String(b.date_in || '').localeCompare(String(a.date_in || ''));
        return byDate !== 0 ? byDate : Number(b.id) - Number(a.id);
    });
}

function backjobMatches(job, q) {
    if (!q) return true;
    return [
        job.plate_number, job.customer, job.moto_model,
        job.complaint, job.mechanic_name,
    ].join(' ').toLowerCase().includes(q.toLowerCase());
}

function jobsForMechanic(name, pool) {
    const key = String(name || '').trim();
    return pool.filter(job => mechanicKey(job) === key);
}

function mostCommon(values) {
    const counts = {};
    values.forEach(value => {
        const key = String(value || '').trim();
        if (!key) return;
        counts[key] = (counts[key] || 0) + 1;
    });
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b))[0] || '';
}

function mechanicRows(jobs) {
    const names = [];
    const seen = {};
    jobs.forEach(job => {
        const name = mechanicKey(job);
        if (seen[name]) return;
        seen[name] = true;
        names.push(name);
    });

    return names
        .map(name => {
            const theirs = jobsForMechanic(name, jobs);
            const allTheirs = jobsForMechanic(name, allShopJobs());
            const total = allTheirs.length;
            const claims = allTheirs.filter(job => job.is_warranty_claim).length;
            const qualityPct = total > 0 ? ((total - claims) / total) * 100 : null;
            const root = mostCommon(theirs.map(job => job.complaint));
            const part = mostCommon(theirs.flatMap(job => (
                job.specs ? consumablesOf(job.specs).map(line => line.name) : []
            )));
            let status = { cls: 'green', label: 'Closed' };
            if (theirs.some(job => job.stage === 'QA' || job.stage === 'Tuning')) {
                status = { cls: 'yellow', label: 'Re-testing' };
            } else if (theirs.some(job => isOpenClaim(job))) {
                status = { cls: 'orange', label: 'Open' };
            }
            const rated = theirs.filter(job => Number(job.rating) >= 1 && Number(job.rating) <= 5);
            const ratingAvg = rated.length
                ? rated.reduce((sum, job) => sum + Number(job.rating), 0) / rated.length
                : null;
            return {
                name,
                count: theirs.length,
                root: root || 'No complaint logged',
                part,
                qualityPct,
                ratingAvg,
                ratingCount: rated.length,
                status,
            };
        })
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function monthStamp() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function backjobKpis() {
    const month = monthStamp();
    const monthJobs = allShopJobs().filter(job => String(job.date_in || '').startsWith(month));
    const monthRate = monthJobs.length > 0
        ? (monthJobs.filter(job => job.is_warranty_claim).length / monthJobs.length) * 100
        : 0;
    const active = backjobRows.filter(isOpenClaim).length;
    const partsCost = backjobRows.reduce((sum, job) => sum + Number(job.specs?.partsCost || 0), 0);
    return { active, monthRate, partsCost };
}

function filteredBackjobPool() {
    let jobs = backjobRows.filter(job => backjobMatches(job, backjobSearch));
    if (backjobMechanic) {
        jobs = jobs.filter(job => mechanicKey(job) === backjobMechanic);
    }
    const counts = {
        open: jobs.filter(isOpenClaim).length,
        closed: jobs.filter(job => !isOpenClaim(job)).length,
    };
    counts.all = jobs.length;
    if (backjobStatus === 'open') jobs = jobs.filter(isOpenClaim);
    if (backjobStatus === 'closed') jobs = jobs.filter(job => !isOpenClaim(job));
    return { jobs: sortBackjobs(jobs), counts };
}

function partsListHtml(job) {
    if (!job.specs) return '<p class="bj-muted">No tuning logged yet</p>';
    const parts = consumablesOf(job.specs);
    if (parts.length === 0) return '<p class="bj-muted">No shop-covered parts</p>';
    return `<ul class="bj-parts">${parts.map(line => `<li>${esc(line.name)} (x${line.qty})</li>`).join('')}</ul>`;
}

function claimStatusHtml(job) {
    if (!isOpenClaim(job)) return `<span class="bj-status is-closed">Closed</span>`;
    return `<span class="bj-status is-open">${esc(job.stage)}</span>`;
}

function mechanicLabel(name) {
    return name === 'Unassigned' ? 'Unassigned' : displayName(name);
}

function backjobHeaderHtml() {
    const claimBtn = currentRole === 'staff'
        ? `<button type="button" class="btn btn-primary" onclick="logBackjobClaim()">${icon('plus')} Log claim</button>`
        : '';
    return `
        <input type="search" id="backjobSearchInput" class="search-bar"
               placeholder="Plate, complaint, or mechanic"
               value="${esc(backjobSearch)}"
               oninput="searchBackjobsLive()">
        ${claimBtn}`;
}

function refreshBackjobHeader() {
    const actions = document.getElementById('headerActions');
    if (actions) actions.innerHTML = backjobHeaderHtml();
}

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
    ctx.desc.innerText = 'Open warranty claims first. Click a row to open the job.';
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
    renderBackjobResults();
};

window.clearBackjobMechanic = function () {
    backjobMechanic = '';
    renderBackjobResults();
};

window.setBackjobStatus = function (status) {
    backjobStatus = status;
    backjobTab = 'claims';
    renderBackjobResults();
};

window.setBackjobTab = function (tab) {
    backjobTab = tab;
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
    const mechChip = backjobMechanic
        ? `<button type="button" class="bj-chip" onclick="clearBackjobMechanic()">
                ${esc(mechanicLabel(backjobMechanic))} <span aria-hidden="true">×</span>
           </button>`
        : '';

    content.innerHTML = `
        <div class="bj-page">
            ${backjobKpiHtml(kpis)}
            <div class="bj-toolbar">
                <div class="list-tabs" role="tablist" aria-label="Back-jobs views">
                    <button type="button" class="list-tab${backjobTab === 'claims' ? ' is-active' : ''}"
                            onclick="setBackjobTab('claims')">Claims</button>
                    <button type="button" class="list-tab${backjobTab === 'mechanics' ? ' is-active' : ''}"
                            onclick="setBackjobTab('mechanics')">By mechanic</button>
                </div>
                <div class="list-tabs bj-status-tabs" role="tablist" aria-label="Claim status">
                    ${statusChip('open', 'Open', counts.open)}
                    ${statusChip('closed', 'Closed', counts.closed)}
                    ${statusChip('all', 'All', counts.all)}
                </div>
                ${mechChip}
            </div>
            ${backjobTab === 'mechanics' ? mechanicPanelHtml(jobs) : claimsPanelHtml(jobs, counts)}
        </div>
    `;
}

function statusChip(key, label, count) {
    return `<button type="button" class="list-tab${backjobStatus === key ? ' is-active' : ''}"
                    onclick="setBackjobStatus('${key}')">
                ${label} <span class="list-tab-count">${count}</span>
            </button>`;
}

function claimsPanelHtml(jobs, counts) {
    if (jobs.length === 0) {
        const hint = backjobStatus === 'open' && counts.closed > 0
            ? `<p>No open claims. <button type="button" class="btn-inline" onclick="setBackjobStatus('all')">View all</button></p>`
            : `<p>Try a plate number, part of the complaint, or a mechanic name.</p>`;
        return `
            <div class="empty-state">
                <div class="empty-icon">${icon('search')}</div>
                <h3>${backjobSearch || backjobMechanic ? 'No matching claims' : 'No claims in this filter'}</h3>
                ${hint}
            </div>`;
    }

    return `<div class="bj-claim-list">${jobs.map(claimRowHtml).join('')}</div>`;
}

function claimRowHtml(job) {
    const open = String(backjobOpenId) === String(job.id);
    const mechanic = mechanicLabel(mechanicKey(job));
    const onBoard = isOpenClaim(job);
    const openLabel = onBoard ? 'Open in Workflow' : 'Open in History';
    const printBtn = job.specs
        ? `<button type="button" class="btn btn-ghost" data-id="${esc(job.id)}" onclick="event.stopPropagation(); printReceipt(this.dataset.id)">${icon('printer')} Print</button>`
        : '';
    const customerRate = Number(job.rating) >= 1
        ? `${starsDisplay(job.rating)} ${Number(job.rating)}/5${job.rating_comment ? `<p>${esc(job.rating_comment)}</p>` : ''}`
        : '<p class="bj-muted">Not rated</p>';

    return `
        <article class="bj-claim${open ? ' is-expanded' : ''}${onBoard ? ' is-active-job' : ''}">
            <div class="bj-claim-row">
                <button type="button" class="bj-claim-main" data-id="${esc(job.id)}"
                        onclick="openBackjob(this.dataset.id)">
                    <strong class="bj-plate">${esc(job.plate_number)}</strong>
                    <span class="bj-model">${esc(job.moto_model)}</span>
                    <span class="bj-complaint">${job.complaint ? esc(job.complaint) : 'No complaint logged'}</span>
                    <span class="bj-tech">${esc(mechanic)}</span>
                    ${claimStatusHtml(job)}
                    <time datetime="${esc(job.date_in || '')}">${esc(job.date_in || '—')}</time>
                </button>
                <button type="button" class="bj-claim-toggle" data-id="${esc(job.id)}"
                        aria-expanded="${open ? 'true' : 'false'}"
                        aria-label="${open ? 'Hide details' : 'Show details'}"
                        onclick="toggleBackjobRow(this.dataset.id)">
                    ${icon('chevron-down')}
                </button>
            </div>
            ${open ? `
                <div class="bj-claim-detail">
                    <div>
                        <h3>Customer</h3>
                        <p>${esc(displayName(job.customer))}</p>
                    </div>
                    <div>
                        <h3>Parts (shop covered)</h3>
                        ${partsListHtml(job)}
                    </div>
                    <div>
                        <h3>Customer rating</h3>
                        ${customerRate}
                    </div>
                    <div class="bj-claim-actions">
                        <button type="button" class="btn btn-primary" data-id="${esc(job.id)}"
                                onclick="openBackjob(this.dataset.id)">${openLabel}</button>
                        ${printBtn}
                    </div>
                </div>` : ''}
        </article>`;
}

function mechanicPanelHtml(jobs) {
    const rows = mechanicRows(jobs);
    if (rows.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-icon">${icon('users')}</div>
                <h3>No mechanics in this filter</h3>
                <p>Switch status or clear search to see who handled claims.</p>
            </div>`;
    }

    const matrixRows = rows.map(row => {
        const quality = row.qualityPct == null ? '—' : `${row.qualityPct.toFixed(1)}%`;
        const customerRate = row.ratingAvg == null
            ? 'Not rated'
            : `${starsDisplay(row.ratingAvg)} ${row.ratingAvg.toFixed(1)}/5 · ${row.ratingCount}`;
        return `<tr>
            <td>
                <strong>${esc(mechanicLabel(row.name))}</strong>
                <b>${row.count}</b>
                <small>${row.name === 'Unassigned' ? 'No lead tech' : 'Assigned tech'}</small>
                <small>${customerRate}</small>
            </td>
            <td>
                ${esc(row.root)}
                ${row.part ? `<small>Parts reused: ${esc(row.part)}</small>` : ''}
            </td>
            <td>${esc(quality)}</td>
            <td>
                <span class="bj-quality ${row.status.cls}">${esc(row.status.label)}</span>
                <button type="button" data-mech="${esc(row.name)}" onclick="filterBackjobMechanic(this.dataset.mech)">View claims</button>
            </td>
        </tr>`;
    }).join('');

    return `
        <section class="bj-panel bj-matrix">
            <h2>By mechanic</h2>
            <div class="bj-table-scroll">
                <table>
                    <thead><tr>
                        <th>Mechanic</th>
                        <th>Common complaint</th>
                        <th>First-time rate</th>
                        <th></th>
                    </tr></thead>
                    <tbody>${matrixRows}</tbody>
                </table>
            </div>
        </section>`;
}

function backjobKpiHtml(kpis) {
    const rateWarn = kpis.monthRate >= 3;
    return `
        <div class="bj-kpis">
            <button type="button" class="bj-kpi warning${backjobStatus === 'open' && backjobTab === 'claims' ? ' is-on' : ''}"
                    onclick="setBackjobStatus('open')">
                <div>
                    <h3>${kpis.active}</h3>
                    <p>Open now</p>
                    <small>${kpis.active > 0 ? 'Tap to show open claims' : 'None in the shop'}</small>
                </div>
                ${icon('triangle-alert')}
            </button>
            <article class="bj-kpi ${rateWarn ? 'warning' : 'good'}">
                <div>
                    <h3>${kpis.monthRate.toFixed(1)}%</h3>
                    <p>This month's re-service rate</p>
                    <small>Aim below 3%</small>
                </div>
                ${icon(rateWarn ? 'trending-down' : 'trending-up')}
            </article>
            <article class="bj-kpi neutral">
                <div>
                    <h3>${peso(kpis.partsCost)}</h3>
                    <p>Warranty parts cost</p>
                    <small>Shop-covered on these claims</small>
                </div>
                ${icon('sliders')}
            </article>
        </div>`;
}
