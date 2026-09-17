// ============================================================
// MotoTrack — Back-jobs panels
// Split from backjobs.js. Behavior unchanged.
// ============================================================

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
    return '';
}

function backjobLogClaimHtml() {
    if (currentRole !== 'staff') return '';
    return `<button type="button" class="btn btn-primary bj-log-claim" onclick="logBackjobClaim()">${icon('plus')} Log claim ${icon('chevron-right')}</button>`;
}

function refreshBackjobHeader() {
    const actions = document.getElementById('pageToolbar');
    if (actions) actions.innerHTML = backjobHeaderHtml();
}

function backjobViewLabel() {
    return backjobTab === 'mechanics' ? 'By mechanic' : 'Claims';
}

function backjobStatusLabel() {
    if (backjobStatus === 'open') return 'Open';
    if (backjobStatus === 'closed') return 'Closed';
    return 'All Status';
}

function backjobSortLabel() {
    return backjobSort === 'oldest' ? 'Oldest' : 'Newest';
}

function backjobMechanicFilterLabel() {
    return backjobMechanic ? mechanicLabel(backjobMechanic) : 'All mechanics';
}

function backjobSelectHtml(kind, fieldLabel, buttonId, currentLabel) {
    return `
        <div class="wrn-field wrn-select-wrap">
            <span class="wrn-field-label">${esc(fieldLabel)}</span>
            <button type="button" class="wrn-select" id="${esc(buttonId)}"
                    onclick="toggleBackjobMenu(event, '${esc(kind)}')"
                    aria-haspopup="listbox" aria-expanded="false"
                    aria-label="${esc(fieldLabel)}">
                <em>${esc(currentLabel)}</em>
                ${icon('chevron-down')}
            </button>
        </div>`;
}

function backjobCurrentValue(kind) {
    if (kind === 'view') return backjobTab;
    if (kind === 'status') return backjobStatus;
    if (kind === 'sort') return backjobSort;
    return backjobMechanic || 'all';
}

function backjobSelectOptions(kind) {
    if (kind === 'view') {
        return [
            { value: 'claims', label: 'Claims' },
            { value: 'mechanics', label: 'By mechanic' },
        ];
    }
    if (kind === 'status') {
        const { counts } = filteredBackjobPool();
        return [
            { value: 'all', label: `All Status (${counts.all})` },
            { value: 'open', label: `Open (${counts.open})`, dot: 'open' },
            { value: 'closed', label: `Closed (${counts.closed})`, dot: 'closed' },
        ];
    }
    if (kind === 'sort') {
        return [
            { value: 'newest', label: 'Newest' },
            { value: 'oldest', label: 'Oldest' },
        ];
    }
    return [
        { value: 'all', label: 'All mechanics' },
        ...mechanicOptions().map(name => ({ value: name, label: mechanicLabel(name) })),
    ];
}

function backjobMenuHtml(kind) {
    const current = backjobCurrentValue(kind);
    const aria = kind === 'view' ? 'View' : kind === 'status' ? 'Status' : kind === 'sort' ? 'Sort' : 'Assigned';
    return `
        <div class="wrn-menu" role="listbox" aria-label="${esc(aria)}">
            ${backjobSelectOptions(kind).map(opt => {
                const on = opt.value === current;
                const dot = opt.dot
                    ? `<i class="wrn-dot${opt.dot === 'open' ? ' is-active' : ''}"></i>`
                    : '';
                return `<button type="button" role="option" class="${on ? 'is-on' : ''}"
                            data-kind="${esc(kind)}" data-value="${esc(opt.value)}"
                            aria-selected="${on ? 'true' : 'false'}"
                            onclick="event.stopPropagation(); pickBackjobFilter(this.dataset.kind, this.dataset.value)">
                            <span>${dot}${esc(opt.label)}</span>
                            ${on ? icon('check') : ''}
                        </button>`;
            }).join('')}
        </div>`;
}

function backjobFiltersHtml() {
    return `
        <div class="wrn-filters bj-filters-bar">
            <div class="list-search wrn-search">
                ${icon('search')}
                <input type="search" id="backjobSearchInput"
                       placeholder="Search by plate, complaint, or mechanic"
                       value="${esc(backjobSearch)}"
                       oninput="searchBackjobsLive()">
            </div>
            ${backjobSelectHtml('view', 'View', 'bjViewBtn', backjobViewLabel())}
            ${backjobSelectHtml('status', 'Status', 'bjStatusBtn', backjobStatusLabel())}
            ${backjobSelectHtml('sort', 'Sort', 'bjSortBtn', backjobSortLabel())}
            ${backjobSelectHtml('mechanic', 'Assigned', 'bjMechBtn', backjobMechanicFilterLabel())}
            ${backjobLogClaimHtml()}
        </div>`;
}

function backjobTableHtml(jobs, counts) {
    return backjobTab === 'mechanics' ? mechanicPanelHtml(jobs) : claimsPanelHtml(jobs, counts);
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
                   onclick="event.stopPropagation(); closeRowMenus(); openBillDetail(this.dataset.id)">
                ${icon('receipt')} View bill
           </button>
           <button type="button" role="menuitem" data-id="${esc(job.id)}"
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
                   onclick="event.stopPropagation(); openBillDetail(this.dataset.id)">
                View bill
           </button>
           <button type="button" class="bj-print" data-id="${esc(job.id)}"
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
