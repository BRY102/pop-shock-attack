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

function jobHasLoggedSpecs(job) {
    return !!(job?.specs);
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

function kanbanCardMenuHtml(job, stage) {
    if (currentRole !== 'staff') return '';
    const id = esc(String(job.id));
    const items = [];

    if (stage === 'Disassembly') {
        items.push(`<button type="button" role="menuitem" data-id="${id}"
                        onclick="event.stopPropagation(); closeRowMenus(); openEditJobDetails(this.dataset.id)">
                        ${icon('pencil')} Edit details
                    </button>`);
    }

    if (stage === 'Tuning') {
        items.push(`<button type="button" role="menuitem" data-id="${id}"
                        onclick="event.stopPropagation(); closeRowMenus(); openChangeMechanic(this.dataset.id)">
                        ${icon('wrench')} Change mechanic
                    </button>`);
    }

    if (stage === 'QA' && job.specs) {
        items.push(`<button type="button" role="menuitem" data-id="${id}"
                        onclick="event.stopPropagation(); closeRowMenus(); openBillDetail(this.dataset.id)">
                        ${icon('receipt')} View bill
                    </button>
                    <button type="button" role="menuitem" data-id="${id}"
                        onclick="event.stopPropagation(); closeRowMenus(); printReceipt(this.dataset.id)">
                        ${icon('printer')} Print
                    </button>`);
    }

    if (stage !== 'QA' && stage !== 'Release') {
        items.push(`<button type="button" role="menuitem" class="is-danger" data-id="${id}"
                        onclick="event.stopPropagation(); closeRowMenus(); deleteJob(this.dataset.id)">
                        ${icon('trash')} Cancel Job
                    </button>`);
    }

    if (items.length === 0) return '';

    return `
        <div class="row-menu-wrap kanban-card-menu">
            <button type="button" class="row-menu-btn" onclick="event.stopPropagation(); toggleRowMenu(event, 'kb-${id}')"
                    aria-haspopup="true" aria-expanded="false" aria-label="Card actions">
                ${icon('ellipsis')}
            </button>
            <div class="row-menu hidden" id="rowMenu-kb-${id}" role="menu">
                ${items.join('')}
            </div>
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
    if (currentRole === 'staff' && stage === 'Disassembly') {
        mechanicHtml = kanbanTechPicker(job);
    } else if (job.mechanic_name) {
        mechanicHtml = `<div class="kanban-tech is-set"><p><strong>Lead Tech:</strong> ${esc(job.mechanic_name)}</p></div>`;
    } else if (currentRole === 'staff' && stage === 'Tuning') {
        mechanicHtml = `<div class="kanban-tech is-required">
            <p><strong>Lead Tech</strong> not assigned</p>
            <small>Change mechanic from the card menu.</small>
        </div>`;
    }

    // Log Specs stays on the Tuning card. Cancel Job, View bill, and Print
    // live in the ⋯ menu so the card stays small.
    let btnHtml = '';
    if (currentRole === 'staff' && stage === 'Tuning') {
        const needsTech = stageNeedsLeadTech(stage) && !jobHasLeadTech(job);
        const specBtn = needsTech
            ? `<button type="button" class="btn-sm" disabled>Change mechanic first</button>`
            : (jobHasLoggedSpecs(job)
                ? `<button type="button" class="btn-sm" onclick="openSpecs('${job.id}')">Revise specs</button>`
                : `<button class="btn-sm" onclick="openSpecs('${job.id}')">Log Specs & Compute</button>`);
        btnHtml = `<div class="action-btns">${specBtn}</div>`;
    }
    if (stage === 'Release') {
        btnHtml = `<div class="action-btns"><span class="badge-done">${icon('check')} Completed</span></div>`;
    }

    const complaintHtml = job.complaint
        ? `<p style="font-size:0.85rem;"><strong>Complaint:</strong> ${esc(job.complaint)}</p>`
        : '';

    const canDrag = currentRole === 'staff' && stage !== 'Release';
    const menuHtml = kanbanCardMenuHtml(job, stage);
    const search = esc(`${job.plate_number} ${job.customer} ${job.moto_model} ${job.complaint || ''}`);

    if (stage === 'Release') {
        return `<div class="card kanban-card is-release" data-job-id="${esc(job.id)}" data-stage="${esc(stage)}" data-search="${search}">
            <button type="button" class="kanban-release-toggle" onclick="toggleReleaseCard(this)" aria-expanded="false">
                <span class="kanban-release-cust">${esc(displayName(job.customer))}</span>
                ${icon('chevron-down')}
            </button>
            <div class="kanban-release-body">
                ${wBadge}
                <h4>${esc(job.moto_model)}</h4>
                <p><strong>Plate:</strong> ${esc(job.plate_number)}</p>
                ${complaintHtml}${mechanicHtml}${specHtml}${btnHtml}
            </div>
        </div>`;
    }

    return `<div class="card kanban-card${canDrag ? ' is-draggable' : ''}${menuHtml ? ' has-menu' : ''}" data-job-id="${esc(job.id)}" data-stage="${esc(stage)}" data-search="${search}">${menuHtml}${wBadge}<h4>${esc(job.moto_model)}</h4><p><strong>Customer:</strong> ${esc(displayName(job.customer))}</p><p><strong>Plate:</strong> ${esc(job.plate_number)}</p>${complaintHtml}${mechanicHtml}${specHtml}${btnHtml}</div>`;
}

function kanbanJobsInStage(stage) {
    if (stage !== 'Release') {
        return dbJobs.filter(j => j.stage === stage);
    }

    // Today's releases stay on the board so staff can see what left the
    // floor. Yesterday's cards clear here; Service History keeps them.
    const today = toISODate();
    return (dbReleased || [])
        .filter(job => String(job.date_released || '') === today)
        .sort((a, b) => Number(b.id) - Number(a.id));
}

function renderKanban(ctx) {
    ctx.title.innerText = 'Workflow';
    ctx.desc.innerText = currentRole === 'staff'
        ? 'Drag a card onto the next stage.'
        : 'Shop floor — view only.';

    ctx.actions.innerHTML = toolbarSearchHtml({
        id: 'searchKanbanInput',
        placeholder: 'Plate or customer',
        extra: 'onkeyup="searchKanban()"',
    });

    let html = `<div class="kanban-board">`;
    STAGES.forEach((stage, i) => {
        const jobs = kanbanJobsInStage(stage);
        const active = jobs.length > 0 ? ' has-jobs' : '';
        html += `<div class="line-station">
            <div class="stage-column${active}" data-stage="${esc(stage)}">
                <div class="stage-header">
                    <span class="station-num">${stationNumber(i)}</span>
                    <span class="station-name">${esc(stage)}</span>
                    <span class="station-count">${jobs.length}</span>
                </div>
                <div class="job-list" id="col-${stage}" data-stage="${esc(stage)}">`;
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
    if (currentRole === 'staff') {
        html += `<button type="button" class="kanban-intake-fab" onclick="openIntake()">
            ${icon('plus')} New Intake
        </button>`;
    }
    ctx.content.innerHTML = html;
    bindKanbanDrag();
    focusPendingKanbanCard();

    // Start live auto-refresh for admin (no-op if already running)
    if (currentRole === 'admin' && typeof startKanbanLive === 'function') {
        startKanbanLive();
    }
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

window.toggleReleaseCard = function (btn) {
    const card = btn?.closest?.('.kanban-card.is-release');
    if (!card) return;
    const open = card.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (!open) btn.blur();
};

// Same stage gate as JobStage::allowedTransitions. Tuning → QA still
// goes through Log Specs rather than a silent stage PUT.
const KANBAN_NEXT = {
    Intake: ['Disassembly'],
    Disassembly: ['Tuning'],
    Tuning: ['QA'],
    QA: ['Release', 'Tuning'],
    Release: [],
};

var kanbanDrag = null;
var pendingKanbanMove = null;

function kanbanInteractiveTarget(el) {
    return !!el.closest?.('button, select, option, input, textarea, a, label, .kanban-tech, .action-btns, .row-menu-wrap');
}

function bindKanbanDrag() {
    if (currentRole !== 'staff') return;
    const board = document.querySelector('.kanban-board');
    if (!board) return;
    board.addEventListener('pointerdown', onKanbanPointerDown);
}

function onKanbanPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    if (kanbanInteractiveTarget(e.target)) return;
    const card = e.target.closest('.kanban-card.is-draggable');
    if (!card) return;

    kanbanDrag = {
        jobId: card.dataset.jobId,
        fromStage: card.dataset.stage,
        card,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
        ghost: null,
        offsetX: 0,
        offsetY: 0,
        overCol: null,
    };
    card.setPointerCapture?.(e.pointerId);
    card.addEventListener('pointermove', onKanbanPointerMove);
    card.addEventListener('pointerup', onKanbanPointerUp);
    card.addEventListener('pointercancel', onKanbanPointerUp);
}

function onKanbanPointerMove(e) {
    if (!kanbanDrag || e.pointerId !== kanbanDrag.pointerId) return;
    const dx = e.clientX - kanbanDrag.startX;
    const dy = e.clientY - kanbanDrag.startY;
    if (!kanbanDrag.moved) {
        if (Math.hypot(dx, dy) < 8) return;
        kanbanDrag.moved = true;
        startKanbanGhost(e);
    }
    e.preventDefault();
    moveKanbanGhost(e.clientX, e.clientY);
    highlightKanbanDrop(e.clientX, e.clientY);
}

function startKanbanGhost(e) {
    const card = kanbanDrag.card;
    const rect = card.getBoundingClientRect();
    const ghost = card.cloneNode(true);
    ghost.classList.add('kanban-ghost');
    ghost.removeAttribute('data-job-id');
    ghost.style.width = `${rect.width}px`;
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    document.body.appendChild(ghost);
    kanbanDrag.ghost = ghost;
    kanbanDrag.offsetX = e.clientX - rect.left;
    kanbanDrag.offsetY = e.clientY - rect.top;
    card.classList.add('is-dragging');
    document.body.classList.add('is-kanban-dragging');
}

function moveKanbanGhost(x, y) {
    if (!kanbanDrag?.ghost) return;
    kanbanDrag.ghost.style.left = `${x - kanbanDrag.offsetX}px`;
    kanbanDrag.ghost.style.top = `${y - kanbanDrag.offsetY}px`;
}

function kanbanColumnAt(x, y) {
    const ghost = kanbanDrag?.ghost;
    if (ghost) ghost.style.visibility = 'hidden';
    const el = document.elementFromPoint(x, y);
    if (ghost) ghost.style.visibility = '';
    return el?.closest?.('.stage-column') || null;
}

function highlightKanbanDrop(x, y) {
    const col = kanbanColumnAt(x, y);
    document.querySelectorAll('.stage-column.is-drop-ok, .stage-column.is-drop-no').forEach((el) => {
        el.classList.remove('is-drop-ok', 'is-drop-no');
    });
    if (!col) {
        kanbanDrag.overCol = null;
        return;
    }
    const toStage = col.dataset.stage;
    kanbanDrag.overCol = toStage;
    const ok = toStage !== kanbanDrag.fromStage && (KANBAN_NEXT[kanbanDrag.fromStage] || []).includes(toStage);
    col.classList.add(ok ? 'is-drop-ok' : 'is-drop-no');
}

function finishKanbanDrag(e) {
    if (!kanbanDrag || e.pointerId !== kanbanDrag.pointerId) return;
    const drag = kanbanDrag;
    const card = drag.card;
    card.releasePointerCapture?.(e.pointerId);
    card.removeEventListener('pointermove', onKanbanPointerMove);
    card.removeEventListener('pointerup', onKanbanPointerUp);
    card.removeEventListener('pointercancel', onKanbanPointerUp);
    card.classList.remove('is-dragging');
    drag.ghost?.remove();
    document.body.classList.remove('is-kanban-dragging');
    document.querySelectorAll('.stage-column.is-drop-ok, .stage-column.is-drop-no').forEach((el) => {
        el.classList.remove('is-drop-ok', 'is-drop-no');
    });
    kanbanDrag = null;
    if (!drag.moved) return;
    if (!drag.overCol || drag.overCol === drag.fromStage) return;
    requestKanbanMove(drag.jobId, drag.overCol);
}

function onKanbanPointerUp(e) {
    finishKanbanDrag(e);
}

function requestKanbanMove(jobId, toStage) {
    const job = dbJobs.find(j => String(j.id) === String(jobId));
    if (!job) return;

    const fromStage = job.stage;
    const allowed = KANBAN_NEXT[fromStage] || [];
    if (!allowed.includes(toStage)) {
        const names = allowed.join(' or ') || 'nowhere';
        showNotification(`A unit at ${fromStage} can only move to ${names}.`, 'error');
        return;
    }

    const sendingBack = fromStage === 'QA' && toStage === 'Tuning';
    const needsSpecs = fromStage === 'Tuning' && toStage === 'QA' && !jobHasLoggedSpecs(job);
    if (!sendingBack && stageNeedsLeadTech(fromStage) && !jobHasLeadTech(job)) {
        showNotification('Assign a lead tech before moving this unit.', 'error');
        return;
    }

    const plate = job.plate_number || 'this unit';
    const model = job.moto_model || 'This job';
    let title = 'Move this job?';
    let copy = `Move ${model} (${plate}) from ${fromStage} to ${toStage}?`;
    if (needsSpecs) {
        title = 'Move to QA?';
        copy = `Log specs and compute the bill to move ${model} (${plate}) from Tuning to QA?`;
    } else if (fromStage === 'Tuning' && toStage === 'QA') {
        title = 'Return to QA?';
        copy = `Return ${model} (${plate}) to QA with the billed specs already on this job?`;
    } else if (sendingBack) {
        title = 'Send back to Tuning?';
        copy = `Send ${model} (${plate}) back to Tuning for rework?`;
    } else if (toStage === 'Release') {
        title = 'Release this job?';
        copy = `Release ${model} (${plate}) to the customer?`;
    }

    pendingKanbanMove = { jobId: String(job.id), toStage, needsSpecs };
    const titleEl = document.getElementById('moveStageTitle');
    const copyEl = document.getElementById('moveStageCopy');
    if (titleEl) titleEl.textContent = title;
    if (copyEl) copyEl.textContent = copy;
    openModal('modal-move-stage');
}

window.cancelKanbanMove = function () {
    pendingKanbanMove = null;
    closeModal('modal-move-stage');
};

window.confirmKanbanMove = function () {
    const pending = pendingKanbanMove;
    pendingKanbanMove = null;
    closeModal('modal-move-stage');
    if (!pending) return;
    if (pending.needsSpecs) {
        openSpecs(pending.jobId);
        return;
    }
    moveStage(pending.jobId, pending.toStage);
};

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!document.getElementById('modal-move-stage')?.classList.contains('hidden')) {
        cancelKanbanMove();
    }
});
