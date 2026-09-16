// ============================================================
// MotoTrack — Customer portal
// Detailed dashboard per unit: timeline, job notes, bill
// breakdown, warranty coverage, and printable receipt.
// ============================================================

const STAGE_STATUS_COPY = {
    Intake: 'Your bike has been received',
    Disassembly: 'The shop is taking the unit apart',
    Tuning: 'Your bike is being serviced',
    QA: 'The shop is checking the work',
    Release: 'Ready for pickup',
};

function timeAgo(iso) {
    if (!iso) return '';
    const then = new Date(iso);
    if (Number.isNaN(then.getTime())) return '';
    const mins = Math.max(0, Math.round((Date.now() - then.getTime()) / 60000));
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return days === 1 ? '1 day ago' : `${days} days ago`;
}

function parseLocalISODate(iso) {
    const [y, m, d] = String(iso || '').split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
}

function initialsOf(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

function sortJobsNewest(jobs) {
    return [...jobs].sort((a, b) => {
        const byDate = String(b.date_in || '').localeCompare(String(a.date_in || ''));
        return byDate !== 0 ? byDate : Number(b.id) - Number(a.id);
    });
}

let selectedPrevJobId = null;

function featuredJob(jobs) {
    const pendingId = window.pendingCustomerJobId;
    if (pendingId) {
        const match = jobs.find(j => String(j.id) === String(pendingId));
        if (match) return match;
    }
    const sorted = sortJobsNewest(jobs);
    return sorted.find(j => j.stage !== 'Release') || sorted[0];
}

function previousCustomerJobs() {
    return sortJobsNewest(dbJobs.filter(job => job.stage === 'Release'));
}

function jobsOnPlate(jobs, plate) {
    const key = plate || 'Unknown';
    return jobs.filter(job => (job.plate_number || 'Unknown') === key);
}

function jobStatusPill(job) {
    if (job.stage === 'Release') {
        return `<span class="cust-pill">Ready for Pickup</span>`;
    }
    return `<span class="cust-pill is-live">${esc(job.stage)}</span>`;
}

function buildCustTimeline(job) {
    const currentStage = job.stage;
    const currentIdx = STAGES.indexOf(currentStage);
    const released = currentStage === 'Release';
    const updated = timeAgo(job.updated_at);

    let steps = '';
    STAGES.forEach((stage, i) => {
        const done = i < currentIdx || released;
        const current = !done && i === currentIdx;
        const cls = done ? 'done' : (current ? 'current' : '');
        const glyph = done || current ? icon('check') : icon(STAGE_LINE_ICONS[stage]);
        let cap = '';
        if (released && stage === 'Release') {
            cap = `<span class="stage-cap">Ready for Pickup</span>`;
        } else if (done && updated) {
            cap = `<span class="stage-cap">${esc(updated)}</span>`;
        } else if (current) {
            cap = `<span class="stage-cap is-now">Now${updated ? ` · ${esc(updated)}` : ''}</span>`;
        }
        steps += `<div class="stage-step ${cls}"><div class="stage-dot">${glyph}</div><div class="stage-label">${stage}</div>${cap}</div>`;
    });

    const sentence = STAGE_STATUS_COPY[currentStage] || currentStage;
    return `
        <div class="cust-card-head">
            <h2>Job Timeline</h2>
            ${jobStatusPill(job)}
        </div>
        <div class="stage-tracker cust-tracker">${steps}</div>
        <p class="cust-timeline-status">${esc(sentence)}</p>`;
}

function technicianNotes(job) {
    const notes = [];
    if (job.complaint) notes.push(job.complaint);
    if (job.specs) {
        if (job.specs.oil && job.specs.oil !== 'None') notes.push(`Fork oil: ${job.specs.oil}`);
        if (job.specs.oilSeal && job.specs.oilSeal !== 'None') notes.push(`${job.specs.oilSeal} replaced`);
        if (job.specs.dustSeal && job.specs.dustSeal !== 'None') notes.push(`${job.specs.dustSeal} replaced`);
        else if (job.specs.dustSeal === 'None') notes.push('Dust seals not replaced');
        if (job.specs.springs && job.specs.springs !== 'None') notes.push(`${job.specs.springs} fitted`);
        if (job.suspension_type) notes.push(`Suspension: ${job.suspension_type}`);
        if (job.suspension_brand) notes.push(`Brand: ${job.suspension_brand}`);
        if (job.oil_viscosity) notes.push(`Viscosity: ${job.oil_viscosity}`);
        if (job.stage === 'QA') notes.push('In quality check');
        if (job.stage === 'Release') notes.push('Released after QA');
    } else {
        notes.push('Tuning not logged yet');
    }
    return notes;
}

function warrantyCoverageHtml(state) {
    if (state.state === 'active') {
        const end = parseLocalISODate(state.expires);
        const start = end ? new Date(end) : null;
        if (start) start.setMonth(start.getMonth() - WARRANTY_MONTHS);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const total = start && end ? end - start : 1;
        const left = end ? end - today : 0;
        const pct = Math.max(0, Math.min(100, (left / total) * 100));
        return `
            <div class="cust-warranty is-active">
                <div class="cust-warranty-copy">
                    <strong>Warranty</strong>
                    <b>Still valid</b>
                    <span>Covered until ${esc(formatWarrantyDate(state.expires))}</span>
                    <span>Re-service is allowed.</span>
                </div>
                <div class="cust-warranty-meter">
                    <div class="cust-warranty-bar" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100">
                        <i style="width:${pct.toFixed(1)}%"></i>
                    </div>
                    <span>Remaining coverage</span>
                </div>
            </div>`;
    }
    return warrantyProofCard(state);
}

function billBreakdownHtml(job) {
    if (!job.specs) {
        return `
            <h2>Total Billed &amp; Breakdown</h2>
            <p class="cust-muted">Billing appears after the shop logs tuning specs.</p>`;
    }

    const bill = billView(job);
    return `
        <h2>Total Billed &amp; Breakdown</h2>
        ${billTableHtml(job)}
        <p class="cust-bill-total">Total Billed: ${peso(bill.due)}</p>`;
}

function custJobCard(job, plateJobs) {
    const notes = technicianNotes(job);
    const tech = (job.mechanic_name || '').trim();
    const techHtml = tech
        ? `<div class="cust-tech"><span class="cust-tech-ava">${esc(initialsOf(tech))}</span><span>Lead Tech: <strong>${esc(displayName(tech))}</strong></span></div>`
        : `<div class="cust-tech is-empty">Lead tech not assigned yet</div>`;
    const claim = job.is_warranty_claim
        ? `<span class="badge-warranty" style="position:static; display:inline-block;">RE-SERVICE</span>`
        : '';

    return `
        <div class="cust-job-top">
            <div class="cust-vehicle">
                ${claim}
                <div class="cust-vehicle-title">
                    <h3>${esc(job.moto_model)}</h3>
                    <p>Plate: ${esc(job.plate_number)}</p>
                </div>
                <div class="cust-bike" aria-hidden="true">${icon('bike')}</div>
            </div>
            <div class="cust-notes">
                <h3>Technician notes</h3>
                <ul>${notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>
                ${techHtml}
            </div>
        </div>
        ${warrantyCoverageHtml(unitWarrantyState(plateJobs))}
        ${job.stage === 'Release' ? `
            <div class="cust-job-rate">
                <h3>${Number(job.rating) >= 1 ? 'Your rating' : 'Rate this service'}</h3>
                ${custRatingBlock(job)}
            </div>` : ''}`;
}

function starPickerHtml(jobId) {
    return [1, 2, 3, 4, 5].map(n =>
        `<button type="button" class="cust-star" data-star="${n}" onclick="pickJobRating(${jobId}, ${n})" aria-label="${n} star${n === 1 ? '' : 's'}">★</button>`
    ).join('');
}

function custRatingBlock(job) {
    if (job.stage !== 'Release') return '';
    if (Number(job.rating) >= 1) {
        return `
            <div class="cust-rate is-done">
                <div class="cust-rate-row">
                    ${starsDisplay(job.rating)}
                    <span class="cust-rate-score">${Number(job.rating)}/5</span>
                </div>
                ${job.rating_comment ? `<span class="cust-muted">${esc(job.rating_comment)}</span>` : ''}
            </div>`;
    }
    return `
        <div class="cust-rate" id="cust-rate-${job.id}" data-stars="">
            <div class="cust-stars" role="radiogroup" aria-label="Rating">${starPickerHtml(job.id)}</div>
            <input type="text" id="cust-rate-comment-${job.id}" class="cust-rate-comment"
                   maxlength="280" placeholder="Optional comment">
            <button type="button" class="cust-btn" onclick="submitJobRating(${job.id})">Submit rating</button>
        </div>`;
}

function custActionsCard(job) {
    const printBill = job.specs
        ? `<button type="button" class="cust-btn" onclick="printReceipt('${job.id}')">${icon('printer')} Print Detailed Receipt</button>`
        : `<p class="cust-muted">A receipt is available after billing is logged.</p>`;

    return `
        <h2>Action Panel</h2>
        <div class="cust-actions">${printBill}</div>`;
}

function custVehicleCard(job, plateJobs) {
    const state = unitWarrantyState(plateJobs);
    const next = state.expires
        ? (state.state === 'active'
            ? `Covered until ${formatWarrantyDate(state.expires)}`
            : `Ended ${formatWarrantyDate(state.expires)}`)
        : 'Starts when this unit is first released';
    return `
        <h2>Vehicle Information</h2>
        <p>Unit: ${esc(job.moto_model)}<br>Plate: ${esc(job.plate_number)}<br>This visit: ${esc(job.date_in)}<br>Next coverage: ${esc(next)}</p>`;
}

function customerPortalHtml(job) {
    const plateJobs = jobsOnPlate(dbJobs, job.plate_number);
    return `
        <div class="cust-portal">
            <section class="cust-unit">
                <div class="cust-col">
                    <article class="cust-card cust-timeline">${buildCustTimeline(job)}</article>
                    <article class="cust-card cust-job">${custJobCard(job, plateJobs)}</article>
                </div>
                <div class="cust-col">
                    <article class="cust-card cust-billing">${billBreakdownHtml(job)}</article>
                    <div class="cust-bottom">
                        <article class="cust-card">${custActionsCard(job)}</article>
                        <article class="cust-card">${custVehicleCard(job, plateJobs)}</article>
                    </div>
                </div>
            </section>
        </div>`;
}

window.pickJobRating = function (jobId, stars) {
    const box = document.getElementById(`cust-rate-${jobId}`);
    if (!box) return;
    box.dataset.stars = String(stars);
    box.querySelectorAll('[data-star]').forEach(btn => {
        btn.classList.toggle('is-on', Number(btn.dataset.star) <= stars);
    });
};

window.submitJobRating = async function (jobId) {
    const box = document.getElementById(`cust-rate-${jobId}`);
    const stars = Number(box?.dataset.stars || 0);
    if (stars < 1 || stars > 5) {
        showNotification('Pick a star rating first.', 'error');
        return;
    }
    const comment = document.getElementById(`cust-rate-comment-${jobId}`)?.value.trim() || '';
    try {
        const response = await apiFetch(`/api/jobs/${jobId}/rating`, {
            method: 'POST',
            body: JSON.stringify({ rating: stars, comment: comment || null }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            showNotification(data.message || 'Could not save rating.', 'error');
            return;
        }
        showNotification(data.message || 'Thanks for the rating.');
        invalidate('jobs');
        const view = document.querySelector('.nav-item.active')?.dataset.view || 'customer';
        loadView(view);
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};

function renderCustomerDashboard(ctx) {
    ctx.title.innerText = `Welcome, ${currentUser}`;
    ctx.desc.innerText = 'Your jobs and warranty.';

    if (dbJobs.length === 0) {
        ctx.content.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">${icon('bike')}</div>
                <h3>No jobs yet</h3>
                <p>When the shop registers your motorcycle, it will show up here.</p>
            </div>`;
        return;
    }

    const job = featuredJob(dbJobs);

    ctx.content.innerHTML = customerPortalHtml(job);
}

function previousJobRow(job) {
    const rate = Number(job.rating) >= 1
        ? `${starsDisplay(job.rating)} ${Number(job.rating)}/5`
        : 'Not rated';
    return `
        <button type="button" class="cust-prev-row" onclick="openCustPrevJob('${job.id}')">
            <span class="cust-prev-row-main">
                <strong>${esc(job.moto_model)}</strong>
                <span>${esc(job.plate_number)} · ${esc(job.date_in)}</span>
            </span>
            <span class="cust-prev-row-meta">
                <span>${job.is_warranty_claim ? 'Re-service' : 'Released'}</span>
                ${job.complaint ? `<em>${esc(job.complaint)}</em>` : ''}
                <span class="cust-prev-rate">${rate}</span>
            </span>
            ${icon('chevron-right')}
        </button>`;
}

window.openCustPrevJob = function (id) {
    selectedPrevJobId = String(id);
    loadView('customer-prev');
};

window.backCustPrevList = function () {
    selectedPrevJobId = null;
    loadView('customer-prev');
};

function renderCustomerPrevious(ctx) {
    ctx.title.innerText = 'Previous jobs';
    ctx.desc.innerText = 'Completed visits and what the shop did.';

    const released = previousCustomerJobs();
    const detail = released.find(job => String(job.id) === String(selectedPrevJobId));

    if (detail) {
        ctx.actions.innerHTML = `<button type="button" class="btn btn-muted" onclick="backCustPrevList()">${icon('undo')} Back to list ${icon('chevron-right')}</button>`;
        ctx.content.innerHTML = customerPortalHtml(detail);
        return;
    }

    selectedPrevJobId = null;

    if (released.length === 0) {
        ctx.actions.innerHTML = '';
        ctx.content.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">${icon('calendar-clock')}</div>
                <h3>No previous jobs</h3>
                <p>Completed visits will show up here after the shop releases your bike.</p>
            </div>`;
        return;
    }

    ctx.actions.innerHTML = '';
    ctx.content.innerHTML = `
        <div class="cust-prev-page">
            ${released.map(previousJobRow).join('')}
        </div>`;
}
