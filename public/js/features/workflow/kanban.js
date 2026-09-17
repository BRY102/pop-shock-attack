// ============================================================
// MotoTrack — Kanban stage-gate board
// Admin sees it read-only; staff move jobs, assign mechanics,
// and log specs from here.
// ============================================================

function jobHasLeadTech(job) {
    return String(job?.mechanic_name || '').trim() !== '';
}

function stageNeedsLeadTech(stage) {
    return stage !== 'Intake' && stage !== 'Release';
}

function kanbanTechPicker(job) {
    const names = dbMechanics.map(m => m.name);
    if (job.mechanic_name && !names.includes(job.mechanic_name)) {
        names.unshift(job.mechanic_name);
    }

    let options = `<option value="">Select lead tech</option>`;
    names.forEach((name) => {
        options += `<option value="${esc(name)}" ${job.mechanic_name === name ? 'selected' : ''}>${esc(name)}</option>`;
    });

    const missing = !jobHasLeadTech(job);
    const emptyNote = names.length === 0
        ? 'Ask an admin to add technicians first.'
        : 'Assign a lead tech before moving.';

    return `
        <div class="kanban-tech${missing ? ' is-required' : ''}">
            <label>Lead Tech <em>*</em></label>
            <select aria-label="Lead tech" onchange="assignMechanic('${esc(String(job.id))}', this.value)">
                ${options}
            </select>
            ${missing ? `<small>${emptyNote}</small>` : ''}
        </div>`;
}

function buildKanbanCard(job, stage) {
    const wBadge = job.is_warranty_claim ? `<span class="badge-warranty">RE-SERVICE</span>` : '';
    const suspension = suspensionLines(job);
    const suspensionHtml = suspension.length > 0
        ? `${suspension.join('<br>')}<hr style="margin:5px 0; border:0; border-top:1px dashed #ccc;">`
        : '';

    const specHtml = job.specs
        ? `<div class="specs-box">${suspensionHtml}<strong>Oil:</strong> ${esc(job.specs.oil)}<br><strong>Oil Seal:</strong> ${esc(job.specs.oilSeal)}<br><strong>Dust Seal:</strong> ${esc(job.specs.dustSeal)}<br><strong>Springs:</strong> ${esc(job.specs.springs)}<hr style="margin:5px 0; border:0; border-top:1px dashed #ccc;"><strong style="color:#28a745;">Bill: ₱${Number(job.specs.totalBill || 0).toLocaleString()}</strong></div>`
        : '';

    let mechanicHtml = '';
    if (currentRole === 'staff' && stageNeedsLeadTech(stage)) {
        mechanicHtml = kanbanTechPicker(job);
    } else if (job.mechanic_name) {
        mechanicHtml = `<div class="kanban-tech is-set"><p><strong>Lead Tech:</strong> ${esc(job.mechanic_name)}</p></div>`;
    }

    // Stage action buttons (staff only)
    let btnHtml = '';
    const billBtns = currentRole === 'staff' ? billedJobButtonsHtml(job, 'btn-sm') : '';
    if (currentRole === 'staff') {
        const idx = STAGES.indexOf(stage);
        const delBtn = `<button class="btn-sm btn-danger" onclick="deleteJob('${job.id}')" style="margin-top:5px;">Cancel Job</button>`;
        const needsTech = stageNeedsLeadTech(stage) && !jobHasLeadTech(job);
        const assignFirst = `<button type="button" class="btn-sm" disabled>Assign a lead tech first</button>`;

        if (stage === 'Tuning') {
            btnHtml = `<div class="action-btns">${needsTech
                ? assignFirst
                : `<button class="btn-sm" onclick="openSpecs('${job.id}')">Log Specs & Compute</button>`}${billBtns}${delBtn}</div>`;
        } else if (stage === 'QA') {
            // No cancel here: a billed unit has to go back to Tuning first, which
            // also returns its parts to stock. The API enforces the same rule.
            btnHtml = `<div class="action-btns">
                ${needsTech
                    ? assignFirst
                    : `<button class="btn-sm" onclick="moveStage('${job.id}', 'Release')">Move to Release</button>`}
                <button class="btn-sm" style="background:#f59e0b; color:#fff;" onclick="moveStage('${job.id}', 'Tuning')">${icon('undo')} Back to Tuning</button>
                ${billBtns}
            </div>`;
        } else if (idx < STAGES.length - 1) {
            btnHtml = `<div class="action-btns">${needsTech
                ? assignFirst
                : `<button class="btn-sm" onclick="moveStage('${job.id}', '${STAGES[idx + 1]}')">Move to ${STAGES[idx + 1]}</button>`}${billBtns}${delBtn}</div>`;
        }
    }
    if (stage === 'Release') {
        btnHtml = `<div class="action-btns"><span class="badge-done">${icon('check')} Completed</span>${billBtns}</div>`;
    }

    const complaintHtml = job.complaint
        ? `<p style="font-size:0.85rem;"><strong>Complaint:</strong> ${esc(job.complaint)}</p>`
        : '';

    return `<div class="card kanban-card" data-job-id="${esc(job.id)}" data-search="${esc(`${job.plate_number} ${job.customer} ${job.moto_model} ${job.complaint || ''}`)}">${wBadge}<h4>${esc(job.moto_model)}</h4><p><strong>Customer:</strong> ${esc(displayName(job.customer))}</p><p><strong>Plate:</strong> ${esc(job.plate_number)}</p>${complaintHtml}${mechanicHtml}${specHtml}${btnHtml}</div>`;
}

function renderKanban(ctx) {
    ctx.title.innerText = 'Workflow';
    ctx.desc.innerText = currentRole === 'staff' ? 'Move jobs through each stage.' : 'Shop floor — view only.';

    let actHtml = `<input type="text" id="searchKanbanInput" class="search-bar" placeholder="Plate or customer" onkeyup="searchKanban()">`;
    if (currentRole === 'staff') {
        actHtml += `<button class="btn btn-primary" onclick="openIntake()">${icon('plus')} New Intake ${icon('chevron-right')}</button>`;
    }
    ctx.actions.innerHTML = actHtml;

    let html = `<div class="kanban-board">`;
    STAGES.forEach((stage, i) => {
        const jobs = dbJobs.filter(j => j.stage === stage);
        const active = jobs.length > 0 ? ' has-jobs' : '';
        html += `<div class="line-station">
            <div class="stage-column${active}">
                <div class="stage-header">
                    <span class="station-num">${stationNumber(i)}</span>
                    <span class="station-name">${esc(stage)}</span>
                    <span class="station-count">${jobs.length}</span>
                </div>
                <div class="job-list" id="col-${stage}">`;
        jobs.forEach(job => {
            html += buildKanbanCard(job, stage);
        });
        html += `</div></div>`;
        if (i < STAGES.length - 1) {
            html += `<div class="line-chevron" aria-hidden="true">${icon('chevron-right')}</div>`;
        }
        html += `</div>`;
    });
    html += `</div>`;
    ctx.content.innerHTML = html;
    focusPendingKanbanCard();
}

function focusPendingKanbanCard() {
    const pending = window.pendingKanbanFocus;
    if (!pending) return;
    const input = document.getElementById('searchKanbanInput');
    if (input && pending.plate) {
        input.value = pending.plate;
        searchKanban();
    }
    const card = [...document.querySelectorAll('.kanban-card')]
        .find(el => el.dataset.jobId === String(pending.id));
    if (!card) return;
    card.classList.add('is-focus');
    card.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

window.searchKanban = function () {
    const filter = document.getElementById('searchKanbanInput').value.toLowerCase();
    document.querySelectorAll('.kanban-card').forEach(card => {
        const text = card.getAttribute('data-search').toLowerCase();
        card.style.display = text.includes(filter) ? 'block' : 'none';
    });
};
