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
        ? `<div class="cust-tech"><span class="cust-tech-ava">${esc(initialsOf(tech))}</span><span>Lead Mech: <strong>${esc(displayName(tech))}</strong></span></div>`
        : `<div class="cust-tech is-empty">Lead mech not assigned yet</div>`;
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
function formatJobDateTime(job, index) {
    let dateStr = 'Aug 28, 2026';
    let timeStr = '09:42 AM';
    const times = ['09:42 AM', '10:15 AM', '02:30 PM', '11:20 AM', '04:45 PM', '01:10 PM', '03:15 PM', '08:50 AM'];

    if (job.date_in) {
        const d = new Date(job.date_in + 'T00:00:00');
        if (!isNaN(d.getTime())) {
            dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
    }
    if (job.created_at && job.created_at.includes(':')) {
        const dt = new Date(job.created_at);
        if (!isNaN(dt.getTime())) {
            timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        } else {
            timeStr = times[index % times.length];
        }
    } else {
        timeStr = times[index % times.length];
    }
    return { dateStr, timeStr };
}

function previousJobRow(job, index) {
    const stage = job.stage || '';

    // Service type
    let serviceType = 'Service';
    if (job.is_warranty_claim) {
        serviceType = 'Re-service';
    } else if (job.specs && ((job.specs.springs && job.specs.springs !== 'None') || (job.specs.oilSeal && job.specs.oilSeal !== 'None'))) {
        serviceType = 'Repair';
    } else if (job.complaint && (job.complaint.toLowerCase().includes('change') || job.complaint.toLowerCase().includes('oil') || job.complaint.toLowerCase().includes('maintenance'))) {
        serviceType = 'Maintenance';
    } else if (job.complaint) {
        serviceType = 'Repair';
    }

    // Status
    let statusLabel, statusKey, statusIconHtml;
    if (stage === 'Release') {
        statusLabel = 'Completed';
        statusKey = 'completed';
        statusIconHtml = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    } else if (['QA', 'Tuning', 'Disassembly'].includes(stage)) {
        statusLabel = 'In Progress';
        statusKey = 'in-progress';
        statusIconHtml = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
    } else {
        statusLabel = 'Pending';
        statusKey = 'pending';
        statusIconHtml = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 16 14"/></svg>';
    }

    // Rating
    const numRating = Number(job.rating);
    const ratingHtml = numRating >= 1 && numRating <= 5
        ? `<div class="rating"><span>${'★'.repeat(numRating)}</span> ${numRating}/5</div>`
        : `<small>Not rated</small>`;

    // Date & Time
    const dt = formatJobDateTime(job, index);

    // Bike color
    const modelLower = (job.moto_model || '').toLowerCase();
    let bikeColorClass = '';
    if (modelLower.includes('pcx') || modelLower.includes('aerox')) {
        bikeColorClass = 'bike-navy';
    } else if (modelLower.includes('classic') || modelLower.includes('burgman') || (index % 2 === 1)) {
        bikeColorClass = 'bike-black';
    }

    return `
        <article class="job-card${index === 0 ? ' first' : ''}" data-status="${statusKey}" onclick="openCustPrevJob('${job.id}')">
            <div class="bike-wrap">
                <div class="bike-icon-box">
                    <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="5.5" cy="17.5" r="3.5" />
                        <circle cx="18.5" cy="17.5" r="3.5" />
                        <circle cx="15" cy="5" r="1.5" fill="currentColor" stroke="none" />
                        <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
                    </svg>
                </div>
            </div>
            <div class="vehicle">
                <h2>${esc(job.moto_model)}</h2>
                <p>${esc(job.plate_number)}<span>•</span>${esc(job.date_in)}</p>
            </div>
            <div class="service">
                <strong><span class="wrench"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></span>${esc(serviceType)}</strong>
                <p>${esc(job.complaint || 'General inspection & tuning')}</p>
                ${ratingHtml}
            </div>
            <div class="status ${statusKey}">
                <span>${statusIconHtml}</span> ${statusLabel}
            </div>
            <div class="date">
                <span><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/></svg></span>
                <div>
                    ${esc(dt.dateStr)}
                    <small>${esc(dt.timeStr)}</small>
                </div>
            </div>
            <button type="button" class="arrow" aria-label="View Details" onclick="event.stopPropagation(); openCustPrevJob('${job.id}')"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>
        </article>`;
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
    ctx.title.innerText = 'Previous Jobs';
    ctx.desc.innerText = 'Completed visits and what the shop did.';
    ctx.actions.innerHTML = '';

    if (selectedPrevJobId) {
        ctx.title.innerText = 'Job Details';
        ctx.desc.innerText = 'Detailed specifications and service timeline.';
        const allForDetail = sortJobsNewest(dbJobs);
        const detail = allForDetail.find(job => String(job.id) === String(selectedPrevJobId));
        if (detail) {
            ctx.actions.innerHTML = `<button type="button" class="btn btn-muted" onclick="backCustPrevList()">${icon('undo')} Back to list ${icon('chevron-right')}</button>`;
            ctx.content.innerHTML = customerPortalHtml(detail);
            return;
        }
        selectedPrevJobId = null;
    }

    const allJobs = sortJobsNewest(dbJobs);

    const filters = `
        <div class="filters">
            <div class="search">
                <span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span>
                <input type="search" id="pjSearch" placeholder="Search by job ID, model, or description..." oninput="filterPreviousJobs()">
            </div>
            <select id="pjStatusSelect" onchange="filterPreviousJobs()">
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="in-progress">In Progress</option>
                <option value="pending">Pending</option>
            </select>
            <div class="total">
                <span>Total Jobs</span>
                <strong id="pjTotalCount">${allJobs.length}</strong>
            </div>
        </div>`;

    if (allJobs.length === 0) {
        ctx.content.innerHTML = `
            <div class="cust-prev-scope">
                ${filters}
                <div class="empty-state" style="padding: 60px 20px; text-align: center; background: rgba(255,255,255,0.85); border-radius: 12px; border: 1px solid #e1eaf2;">
                    <div class="empty-icon" style="font-size: 40px; margin-bottom: 12px;">🏍️</div>
                    <h3 style="font-size: 18px; color: #12283f; margin-bottom: 6px;">No previous jobs</h3>
                    <p style="color: #7389a5; font-size: 14px;">Completed visits will show up here after the shop releases your bike.</p>
                </div>
            </div>`;
        return;
    }

    const jobsList = `
        <div class="jobs-list" id="pjJobsList">
            ${allJobs.map((job, idx) => previousJobRow(job, idx)).join('')}
        </div>`;

    ctx.content.innerHTML = `
        <div class="cust-prev-scope">
            ${filters}
            ${jobsList}
        </div>`;

    window.filterPreviousJobs = function () {
        const q = (document.getElementById('pjSearch')?.value || '').toLowerCase().trim();
        const s = (document.getElementById('pjStatusSelect')?.value || '').toLowerCase();
        const cards = document.querySelectorAll('#pjJobsList .job-card');
        let visibleCount = 0;

        cards.forEach(card => {
            const cardText = card.textContent.toLowerCase();
            const statusMatch = !s || card.dataset.status === s;
            const searchMatch = !q || cardText.includes(q);
            const show = statusMatch && searchMatch;

            card.style.display = show ? '' : 'none';
            if (show) visibleCount++;
        });

        const totalEl = document.getElementById('pjTotalCount');
        if (totalEl) totalEl.textContent = visibleCount;
    };
}
