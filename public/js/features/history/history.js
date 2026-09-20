// ============================================================
// MotoTrack — Service History
// Released visits only (including re-service claims), newest
// first. Jobs still in Tuning stay on the workflow board.
// ============================================================

function sortHistoryJobs(jobs) {
    return [...jobs].sort((a, b) => {
        const byDate = String(b.date_in || '').localeCompare(String(a.date_in || ''));
        return byDate !== 0 ? byDate : Number(b.id) - Number(a.id);
    });
}

async function loadHistoryList(q = '') {
    const content = document.getElementById('mainContentArea');
    const term = q.trim();

    try {
        const path = term.length >= 2
            ? `/api/jobs/search?q=${encodeURIComponent(term)}`
            : '/api/jobs/history';
        const response = await apiFetch(path);
        if (!response.ok) {
            showNotification(term ? 'Search failed.' : 'Could not load service history.', 'error');
            return;
        }

        const jobs = sortHistoryJobs(await response.json());
        dbHistoryCache = jobs;
        renderHistoryResults(jobs, term);
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
        if (content) {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">${icon('search')}</div>
                    <h3>Could not load history</h3>
                    <p>Check the connection and try again.</p>
                </div>`;
        }
    }
}

function renderHistory(ctx) {
    const pending = String(window.pendingHistoryQuery || '').trim();
    window.pendingHistoryQuery = '';

    ctx.title.innerText = 'Service History';
    ctx.desc.innerText = 'Released and re-service visits, newest first.';
    ctx.actions.innerHTML = `
        <input type="text" id="historySearchInput" class="search-bar"
               placeholder="Plate, customer, or model"
               value="${esc(pending)}"
               onkeydown="if (event.key === 'Enter') searchHistory()">
        <button class="btn btn-primary" onclick="searchHistory()">Search ${icon('chevron-right')}</button>
        <button class="btn btn-ghost" onclick="showAllHistory()">Show all ${icon('chevron-right')}</button>
    `;

    ctx.content.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">${icon('search')}</div>
            <h3>Loading history…</h3>
        </div>
    `;

    loadHistoryList(pending);
}

window.searchHistory = function () {
    const q = document.getElementById('historySearchInput')?.value.trim() || '';
    if (q && q.length < 2) {
        showNotification('Enter at least 2 characters to search.', 'error');
        return;
    }
    loadHistoryList(q);
};

window.showAllHistory = function () {
    const input = document.getElementById('historySearchInput');
    if (input) input.value = '';
    loadHistoryList();
};

function renderHistoryResults(jobs, q) {
    const content = document.getElementById('mainContentArea');

    if (jobs.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">${icon('search')}</div>
                <h3>${q ? `No records found for "${esc(q)}"` : 'No service records yet'}</h3>
                <p>${q ? 'Check the spelling, or try part of the plate number only.' : 'Released jobs will show up here.'}</p>
            </div>
        `;
        return;
    }

    // When every result belongs to one unit, lead with its lifetime summary —
    // the "returning customer" story at a glance.
    const plates = [...new Set(jobs.map(j => j.plate_number))];
    let summaryHtml = '';
    if (q && plates.length === 1) {
        const releasedCount = jobs.filter(j => j.stage === 'Release').length;
        const backJobs = jobs.filter(j => j.is_warranty_claim).length;
        const totalBilled = jobs.reduce((sum, j) => sum + Number(j.specs?.totalBill || 0), 0);
        const latest = jobs[0];

        summaryHtml = `
            <div class="unit-summary">
                <div class="unit-title">
                    <h3>${esc(latest.moto_model)}</h3>
                    <code>${esc(latest.plate_number)}</code> · owned by <strong>${esc(displayName(latest.customer))}</strong>
                </div>
                <div class="summary-chips">
                    <div class="chip"><b>${jobs.length}</b><span>Visit${jobs.length === 1 ? '' : 's'}</span></div>
                    <div class="chip"><b>${releasedCount}</b><span>Completed</span></div>
                    <div class="chip"><b>${backJobs}</b><span>Back-jobs</span></div>
                    <div class="chip"><b>${peso(totalBilled)}</b><span>Total billed</span></div>
                </div>
            </div>`;
    }

    let rows = '';
    jobs.forEach(job => {
        const isReleased = job.stage === 'Release';
        const stageBadge = isReleased
            ? `<span class="badge-good">RELEASED</span>`
            : `<span class="badge-stage">${esc(job.stage).toUpperCase()}</span>`;

        const claim = job.is_warranty_claim
            ? `<div style="margin-top:4px;"><span class="badge-service claim">Re-service Claim</span></div>`
            : '';

        const complaintLine = job.complaint ? `Complaint: ${esc(job.complaint)}` : '';
        const setup = job.specs
            ? [
                complaintLine,
                ...suspensionLines(job),
                `Oil: ${esc(job.specs.oil)}`,
                `Seals: ${esc(job.specs.oilSeal)} / ${esc(job.specs.dustSeal)}`,
                `Springs: ${esc(job.specs.springs)}`,
            ].filter(Boolean).join('<br>')
            : (complaintLine || `<span style="color:var(--text-muted);">No tuning logged yet</span>`);

        const bill = job.specs
            ? `<strong style="color:#15803d;">${peso(job.specs.totalBill || 0)}</strong>`
            : '—';

        rows += `<tr>
            <td class="cell-keep">${esc(job.date_in)}</td>
            <td class="cell-keep"><strong>${esc(displayName(job.customer))}</strong></td>
            <td><strong>${esc(job.moto_model)}</strong><br><code style="color:#6b7280; font-size:0.8rem;">${esc(job.plate_number)}</code></td>
            <td>${stageBadge}${claim}</td>
            <td style="font-size:0.8rem; line-height:1.5;">${setup}</td>
            <td>${bill}</td>
            <td>${Number(job.rating) >= 1 ? `${starsDisplay(job.rating)} ${Number(job.rating)}/5` : '—'}</td>
        </tr>`;
    });

    const countLine = q
        ? `<strong>${jobs.length}</strong> record${jobs.length === 1 ? '' : 's'} for "<strong>${esc(q)}</strong>" · newest first`
        : `<strong>${jobs.length}</strong> record${jobs.length === 1 ? '' : 's'} · newest first`;

    content.innerHTML = `
        <p style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
            ${countLine}
        </p>
        ${summaryHtml}
        <div class="table-container table-scroll"><table class="data-table">
            <thead><tr>
                <th class="cell-keep">Date In</th><th class="cell-keep">Customer</th><th>Unit</th><th>Status</th>
                <th>Tuning Setup</th><th>Billed</th><th>Rate</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table></div>
    `;
}
