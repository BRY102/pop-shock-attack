// ============================================================
// MotoTrack — Back-jobs (admin / staff)
// Open warranty claims first. Click a row to expand details.
// Mechanic stats sit on a second tab, not beside the list.
// ============================================================

let backjobRows = [];
let backjobSearch = '';
let backjobMechanic = '';
let backjobStatus = 'all';
let backjobTab = 'claims';
let backjobOpenId = null;
let backjobSort = 'newest';
let backjobFilterOpen = false;

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
        const byDate = String(a.date_in || '').localeCompare(String(b.date_in || ''));
        const dated = backjobSort === 'oldest' ? byDate : -byDate;
        return dated !== 0 ? dated : Number(b.id) - Number(a.id);
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

function monthStamp(offset = 0) {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthClaimRate(stamp) {
    const monthJobs = allShopJobs().filter(job => String(job.date_in || '').startsWith(stamp));
    if (monthJobs.length === 0) return 0;
    return (monthJobs.filter(job => job.is_warranty_claim).length / monthJobs.length) * 100;
}

function backjobKpis() {
    const monthRate = monthClaimRate(monthStamp(0));
    const lastRate = monthClaimRate(monthStamp(-1));
    const active = backjobRows.filter(isOpenClaim).length;
    const partsCost = backjobRows.reduce((sum, job) => sum + Number(job.specs?.partsCost || 0), 0);
    return { active, monthRate, lastRate, partsCost };
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

function claimStatusHtml(job, compact) {
    if (!isOpenClaim(job)) return `<span class="bj-status is-closed">Closed</span>`;
    return `<span class="bj-status is-open">${compact ? 'Open' : esc(job.stage)}</span>`;
}

function mechanicLabel(name) {
    return name === 'Unassigned' ? 'Unassigned' : displayName(name);
}

function bjInitials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function bjAvatar(name) {
    return `<span class="bj-avatar" aria-hidden="true">${esc(bjInitials(name))}</span>`;
}

function mechanicOptions() {
    const names = [];
    const seen = {};
    backjobRows.forEach((job) => {
        const name = mechanicKey(job);
        if (seen[name]) return;
        seen[name] = true;
        names.push(name);
    });
    return names.sort((a, b) => mechanicLabel(a).localeCompare(mechanicLabel(b)));
}

function backjobHeaderHtml() {
    const claimBtn = currentRole === 'staff'
        ? `<button type="button" class="btn btn-primary" onclick="logBackjobClaim()">${icon('plus')} Log claim</button>`
        : '';
    return `
        <div class="bj-search">
            <span class="bj-search-ico" aria-hidden="true">${icon('search')}</span>
            <input type="search" id="backjobSearchInput" class="search-bar"
                   placeholder="Plate, complaint, or mechanic"
                   value="${esc(backjobSearch)}"
                   oninput="searchBackjobsLive()">
            <button type="button" class="bj-search-filter" onclick="toggleBackjobFilter(event)"
                    aria-label="Filter claims">
                ${icon('sliders')}
            </button>
        </div>
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
    renderBackjobResults();
};

window.clearBackjobMechanic = function () {
    backjobMechanic = '';
    backjobFilterOpen = false;
    renderBackjobResults();
};

window.setBackjobStatus = function (status) {
    backjobStatus = backjobStatus === status ? 'all' : status;
    backjobTab = 'claims';
    renderBackjobResults();
};

window.setBackjobTab = function (tab) {
    backjobTab = tab;
    backjobFilterOpen = false;
    renderBackjobResults();
};

window.setBackjobSort = function (sort) {
    backjobSort = sort === 'oldest' ? 'oldest' : 'newest';
    renderBackjobResults();
};

window.toggleBackjobFilter = function (event) {
    event?.stopPropagation();
    backjobFilterOpen = !backjobFilterOpen;
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
                    <label class="bj-sort">
                        <span>Sort by</span>
                        <select aria-label="Sort claims" onchange="setBackjobSort(this.value)">
                            <option value="newest"${backjobSort === 'newest' ? ' selected' : ''}>Newest</option>
                            <option value="oldest"${backjobSort === 'oldest' ? ' selected' : ''}>Oldest</option>
                        </select>
                    </label>
                    ${filterControlHtml()}
                </div>
            </div>
            ${backjobTab === 'mechanics' ? mechanicPanelHtml(jobs) : claimsPanelHtml(jobs, counts)}
        </div>
    `;
}

function statusChip(key, label, count) {
    return `<button type="button" class="bj-tab${backjobStatus === key ? ' is-selected' : ''}"
                    onclick="setBackjobStatus('${key}')">
                ${esc(label)} <strong>${count}</strong>
            </button>`;
}

function filterControlHtml() {
    const names = mechanicOptions();
    const menu = backjobFilterOpen
        ? `<div class="bj-filter-menu" role="listbox" aria-label="Filter by mechanic">
                <button type="button" class="${backjobMechanic ? '' : 'is-on'}"
                        onclick="clearBackjobMechanic()">All mechanics</button>
                ${names.map(name => `
                    <button type="button" data-mech="${esc(name)}"
                            class="${backjobMechanic === name ? 'is-on' : ''}"
                            onclick="filterBackjobMechanic(this.dataset.mech)">
                        ${esc(mechanicLabel(name))}
                    </button>`).join('')}
           </div>`
        : '';
    return `
        <div class="bj-filter-wrap">
            <button type="button" class="bj-tool-btn${backjobMechanic || backjobFilterOpen ? ' is-on' : ''}"
                    onclick="toggleBackjobFilter(event)">
                ${icon('filter')} Filter
            </button>
            ${menu}
        </div>`;
}

function claimsPanelHtml(jobs, counts) {
    if (jobs.length === 0) {
        const hint = backjobStatus === 'open'
            ? `<p>No open claims right now.</p>`
            : `<p>Try a plate number, part of the complaint, or a mechanic name.</p>`;
        return `
            <div class="empty-state">
                <div class="empty-icon">${icon('search')}</div>
                <h3>${backjobSearch || backjobMechanic ? 'No matching claims' : 'No claims in this filter'}</h3>
                ${hint}
            </div>`;
    }

    return `
        <div class="bj-claims-table">
            <div class="bj-table-head" aria-hidden="true">
                <span></span>
                <span>ID / Unit</span>
                <span>Customer</span>
                <span>Parts (Shop Covered)</span>
                <span>Customer Rating</span>
                <span>Assigned To</span>
                <span>Status</span>
                <span>Date</span>
                <span></span>
            </div>
            ${jobs.map(claimRowHtml).join('')}
        </div>`;
}

function claimRowHtml(job) {
    const open = String(backjobOpenId) === String(job.id);
    const mechanic = mechanicLabel(mechanicKey(job));
    const customer = displayName(job.customer);
    const onBoard = isOpenClaim(job);
    const openLabel = onBoard ? 'Open in Workflow' : 'Open in History';
    const printItem = job.specs
        ? `<button type="button" role="menuitem" data-id="${esc(job.id)}"
                   onclick="event.stopPropagation(); closeRowMenus(); printReceipt(this.dataset.id)">
                ${icon('printer')} Print
           </button>`
        : '';
    const rated = Number(job.rating) >= 1 && Number(job.rating) <= 5;
    const ratingHtml = rated
        ? `<span class="bj-rating">${starsDisplay(job.rating)} <small>${Number(job.rating)}/5</small></span>`
        : `<span class="bj-muted">Not rated</span>`;
    const complaint = job.complaint ? esc(job.complaint) : 'No complaint logged';
    const partsHtml = open
        ? partsListHtml(job)
        : `<span class="bj-complaint-line">${complaint}</span>`;
    const printBtn = job.specs
        ? `<button type="button" class="bj-print" data-id="${esc(job.id)}"
                   onclick="event.stopPropagation(); printReceipt(this.dataset.id)">
                ${icon('printer')} Print
           </button>`
        : '';

    return `
        <article class="bj-claim${open ? ' is-expanded' : ''}${onBoard ? ' is-active-job' : ''}">
            <button type="button" class="bj-card-sum" data-id="${esc(job.id)}"
                    onclick="toggleBackjobRow(this.dataset.id)">
                <span class="bj-job-top">
                    <span class="bj-bike-thumb">${icon('bike')}</span>
                    <span class="bj-job-main">
                        <b>${esc(job.plate_number)}</b>
                        <span>${esc(job.moto_model)}</span>
                        <small>${icon('user')} ${esc(customer)}</small>
                    </span>
                    <span class="bj-card-meta">
                        ${claimStatusHtml(job, true)}
                        <time datetime="${esc(job.date_in || '')}">${esc(job.date_in || '—')}</time>
                    </span>
                    <span class="bj-chevron${open ? ' is-open' : ''}" aria-hidden="true">${icon('chevron-right')}</span>
                </span>
                <span class="bj-issue">
                    <span class="bj-card-comp">${complaint}</span>
                    <span class="bj-card-rate">${ratingHtml}</span>
                </span>
            </button>
            ${open ? `
            <div class="bj-card-detail">
                <div class="bj-detail-head">
                    <span class="bj-bike-thumb">${icon('bike')}</span>
                    <div>
                        <b>${esc(job.plate_number)}</b>
                        <span>${esc(job.moto_model)}</span>
                    </div>
                    <time datetime="${esc(job.date_in || '')}">${esc(job.date_in || '—')}</time>
                </div>
                <div class="bj-detail-body">
                    <div class="bj-detail-people">
                        <p>
                            <span>${icon('user')}</span>
                            <span><small>Customer</small><b>${esc(customer)}</b></span>
                        </p>
                        <p>
                            <span>${icon('wrench')}</span>
                            <span><small>Mechanic</small><b>${esc(mechanic)}</b></span>
                        </p>
                    </div>
                    <h4>${icon('package')} Parts (Shop Covered)</h4>
                    ${partsListHtml(job)}
                    <h4>${icon('star')} Customer Rating</h4>
                    ${ratingHtml}
                    <h4>${icon('file-text')} Job Description</h4>
                    <p>${complaint}</p>
                    <div class="bj-card-actions">
                        <button type="button" class="bj-history" data-id="${esc(job.id)}"
                                onclick="event.stopPropagation(); openBackjob(this.dataset.id)">${openLabel}</button>
                        ${printBtn}
                    </div>
                </div>
            </div>` : ''}
            <div class="bj-row-grid">
                <div class="bj-check-cell">
                    <button type="button" class="bj-chevron${open ? ' is-open' : ''}" data-id="${esc(job.id)}"
                            aria-expanded="${open ? 'true' : 'false'}"
                            aria-label="${open ? 'Hide details' : 'Show details'}"
                            onclick="event.stopPropagation(); toggleBackjobRow(this.dataset.id)">
                        ${icon('chevron-right')}
                    </button>
                </div>
                <button type="button" class="bj-unit-cell" data-id="${esc(job.id)}"
                        onclick="toggleBackjobRow(this.dataset.id)">
                    <span class="bj-bike-thumb">${icon('bike')}</span>
                    <span>
                        <b>${esc(job.plate_number)}</b>
                        <small>${esc(job.moto_model)}</small>
                    </span>
                </button>
                <div class="bj-person-cell" data-label="Customer">
                    ${bjAvatar(customer)}
                    <span>${esc(customer)}</span>
                </div>
                <div class="bj-parts-cell" data-label="Parts (Shop Covered)">${partsHtml}</div>
                <div class="bj-rating-cell" data-label="Customer Rating">${ratingHtml}</div>
                <div class="bj-person-cell" data-label="Assigned To">
                    ${bjAvatar(mechanic)}
                    <span>${esc(mechanic)}</span>
                </div>
                <div data-label="Status">${claimStatusHtml(job)}</div>
                <time class="bj-date" datetime="${esc(job.date_in || '')}" data-label="Date">${esc(job.date_in || '—')}</time>
                <div class="bj-row-actions">
                    <div class="row-menu-wrap">
                        <button type="button" class="row-menu-btn" onclick="toggleRowMenu(event, 'bj-${esc(job.id)}')"
                                aria-haspopup="true" aria-expanded="false" aria-label="Actions">
                            ${icon('ellipsis')}
                        </button>
                        <div class="row-menu hidden" id="rowMenu-bj-${esc(job.id)}" role="menu">
                            <button type="button" role="menuitem" data-id="${esc(job.id)}"
                                    onclick="event.stopPropagation(); closeRowMenus(); openBackjob(this.dataset.id)">
                                ${icon('calendar-clock')} ${openLabel}
                            </button>
                            ${printItem}
                        </div>
                    </div>
                </div>
            </div>
            ${open ? `<div class="bj-claim-foot">
                <button type="button" class="bj-history" data-id="${esc(job.id)}"
                        onclick="event.stopPropagation(); openBackjob(this.dataset.id)">${openLabel}</button>
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
            <td data-label="Mechanic">
                <div class="bj-person-cell">
                    ${bjAvatar(mechanicLabel(row.name))}
                    <span>
                        <strong>${esc(mechanicLabel(row.name))}</strong>
                        <small>${row.count} claim${row.count === 1 ? '' : 's'} · ${customerRate}</small>
                    </span>
                </div>
            </td>
            <td data-label="Common complaint">
                ${esc(row.root)}
                ${row.part ? `<small>Parts reused: ${esc(row.part)}</small>` : ''}
            </td>
            <td data-label="First-time rate">${esc(quality)}</td>
            <td data-label="Status">
                <span class="bj-quality ${row.status.cls}">${esc(row.status.label)}</span>
                <button type="button" data-mech="${esc(row.name)}" onclick="filterBackjobMechanic(this.dataset.mech)">View claims</button>
            </td>
        </tr>`;
    }).join('');

    return `
        <section class="bj-panel bj-matrix">
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
    const openLabel = kpis.active === 1 ? 'There is 1 back-job' : (
        kpis.active > 0 ? `There are ${kpis.active} back-jobs` : 'There is no back-job'
    );
    return `
        <div class="bj-kpis">
            <button type="button" class="bj-kpi red${backjobStatus === 'open' && backjobTab === 'claims' ? ' is-on' : ''}"
                    onclick="setBackjobStatus('open')">
                <span class="bj-stat-icon">${icon('triangle-alert')}</span>
                <span class="bj-stat-copy">
                    <strong>${kpis.active}</strong>
                    <span>Open now</span>
                    <small>${openLabel}</small>
                </span>
            </button>
            <article class="bj-kpi ${rateWarn ? 'amber' : 'green'}">
                <span class="bj-stat-icon">${icon(rateWarn ? 'trending-down' : 'trending-up')}</span>
                <span class="bj-stat-copy">
                    <strong>${kpis.monthRate.toFixed(1)}%</strong>
                    <span>This month's re-service rate</span>
                    <small>vs last month ${kpis.lastRate.toFixed(1)}%</small>
                </span>
            </article>
            <article class="bj-kpi blue">
                <span class="bj-stat-icon">${icon('circle-dollar')}</span>
                <span class="bj-stat-copy">
                    <strong>${peso(kpis.partsCost)}</strong>
                    <span>Warranty parts cost</span>
                    <small>Shop-covered on these claims</small>
                </span>
            </article>
        </div>`;
}
