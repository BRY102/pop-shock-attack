// ============================================================
// MotoTrack — Kanban stage-gate board
// Admin sees it read-only; staff move jobs, assign mechanics,
// and log specs from here.
// ============================================================

function buildKanbanCard(job, stage) {
    const wBadge = job.is_warranty_claim ? `<span class="badge-warranty">RE-SERVICE</span>` : '';
    const suspension = suspensionLines(job);
    const suspensionHtml = suspension.length > 0
        ? `${suspension.join('<br>')}<hr style="margin:5px 0; border:0; border-top:1px dashed #ccc;">`
        : '';

    const specHtml = job.specs
        ? `<div class="specs-box">${suspensionHtml}<strong>Oil:</strong> ${esc(job.specs.oil)}<br><strong>Oil Seal:</strong> ${esc(job.specs.oilSeal)}<br><strong>Dust Seal:</strong> ${esc(job.specs.dustSeal)}<br><strong>Springs:</strong> ${esc(job.specs.springs)}<hr style="margin:5px 0; border:0; border-top:1px dashed #ccc;"><strong style="color:#28a745;">Bill: ₱${Number(job.specs.totalBill || 0).toLocaleString()}</strong></div>`
        : '';

    // Mechanic assignment (staff can set it during Disassembly)
    let mechanicHtml = '';
    if (currentRole === 'staff' && stage === 'Disassembly') {
        let options = `<option value="">-- Unassigned --</option>`;
        const names = dbMechanics.map(m => m.name);
        if (job.mechanic_name && !names.includes(job.mechanic_name)) {
            names.unshift(job.mechanic_name);
        }
        names.forEach(m => {
            options += `<option value="${esc(m)}" ${job.mechanic_name === m ? 'selected' : ''}>${esc(m)}</option>`;
        });
        mechanicHtml = `
            <div style="margin-top: 10px; background: #f8f9fa; padding: 8px; border-radius: 6px; border: 1px solid #e5e7eb;">
                <label style="font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase;">Assign Mechanic:</label>
                <select style="width: 100%; padding: 0.4rem; margin-top: 4px; border-radius: 4px; border: 1px solid #ccc; font-family: inherit; font-size: 0.85rem;" onchange="assignMechanic('${job.id}', this.value)">
                    ${options}
                </select>
            </div>`;
    } else if (job.mechanic_name) {
        mechanicHtml = `<div style="margin-top: 10px;"><p style="font-size: 0.85rem;"><strong>Assigned Tech:</strong> <span style="color:var(--text-primary); font-weight:700;">${esc(job.mechanic_name)}</span></p></div>`;
    }

    // Stage action buttons (staff only)
    let btnHtml = '';
    if (currentRole === 'staff') {
        const idx = STAGES.indexOf(stage);
        const delBtn = `<button class="btn-sm btn-danger" onclick="deleteJob('${job.id}')" style="margin-top:5px;">Cancel Job</button>`;

        if (stage === 'Tuning') {
            btnHtml = `<div class="action-btns"><button class="btn-sm" style="background:var(--primary);" onclick="openSpecs('${job.id}')">Log Specs & Compute</button>${delBtn}</div>`;
        } else if (stage === 'QA') {
            // No cancel here: a billed unit has to go back to Tuning first, which
            // also returns its parts to stock. The API enforces the same rule.
            btnHtml = `<div class="action-btns">
                <button class="btn-sm" onclick="moveStage('${job.id}', 'Release')">Move to Release</button>
                <button class="btn-sm" style="background:#f59e0b; color:#fff;" onclick="moveStage('${job.id}', 'Tuning')">${icon('undo')} Back to Tuning</button>
            </div>`;
        } else if (idx < STAGES.length - 1) {
            btnHtml = `<div class="action-btns"><button class="btn-sm" onclick="moveStage('${job.id}', '${STAGES[idx + 1]}')">Move to ${STAGES[idx + 1]}</button>${delBtn}</div>`;
        }
    }
    if (stage === 'Release') {
        btnHtml = `<div class="action-btns"><span class="badge-done">${icon('check')} Completed</span></div>`;
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
        actHtml += `<button class="btn btn-primary" onclick="openIntake()">${icon('plus')} New Intake</button>`;
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
