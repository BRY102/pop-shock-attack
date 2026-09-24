// ============================================================
// MotoTrack — Workflow actions (intake, stage, specs)
// Split from actions.js. Behavior unchanged.
// ============================================================

// ------------------------------------------------------------
// Service jobs
// ------------------------------------------------------------

// Show the free-text brand field only when "Others" is selected.
window.toggleOtherBrand = function () {
    const isOther = document.getElementById('in_brand').value === 'Others';
    const group = document.getElementById('otherBrandGroup');
    const input = document.getElementById('in_brand_other');
    group.classList.toggle('hidden', !isOther);
    input.required = isOther;
    if (!isOther) input.value = '';
    syncIntakeBrandMark();
};

window.syncIntakeBrandMark = function () {
    const select = document.getElementById('in_brand');
    const mark = document.getElementById('in_brand_mark');
    const label = document.getElementById('in_brand_label');
    if (!select || !mark) return;
    const value = select.value || '';
    mark.textContent = value && value !== 'Others' ? value.charAt(0) : '?';
    if (label) {
        const opt = select.options[select.selectedIndex];
        label.textContent = opt ? opt.text : value;
    }
    document.querySelectorAll('#in_brand_menu .intake-dropdown-option').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.value === value);
    });
};

window.buildIntakeBrandMenu = function () {
    const select = document.getElementById('in_brand');
    const menu = document.getElementById('in_brand_menu');
    if (!select || !menu) return;

    menu.innerHTML = [...select.options].map((opt) => `
        <button type="button" role="option" class="intake-dropdown-option${opt.selected ? ' is-active' : ''}"
                data-value="${esc(opt.value)}" onclick="pickIntakeBrand(event)">
            <span class="intake-brand-mark" aria-hidden="true">${opt.value === 'Others' ? '?' : esc(opt.value.charAt(0))}</span>
            ${esc(opt.text)}
        </button>`).join('');
};

window.pickIntakeBrand = function (e) {
    e.preventDefault();
    e.stopPropagation();
    const select = document.getElementById('in_brand');
    if (!select) return;
    select.value = e.currentTarget.dataset.value;
    toggleOtherBrand();
    closeIntakeBrandMenu();
};

window.closeIntakeBrandMenu = function () {
    const menu = document.getElementById('in_brand_menu');
    const btn = document.getElementById('in_brand_btn');
    menu?.classList.add('hidden');
    btn?.setAttribute('aria-expanded', 'false');
    btn?.classList.remove('is-open');
};

window.toggleIntakeBrandMenu = function (e) {
    e.preventDefault();
    e.stopPropagation();
    const menu = document.getElementById('in_brand_menu');
    const btn = document.getElementById('in_brand_btn');
    if (!menu || !btn) return;

    const isOpen = !menu.classList.contains('hidden');
    closeIntakeBrandMenu();
    if (isOpen) return;

    menu.classList.remove('hidden');
    btn.setAttribute('aria-expanded', 'true');
    btn.classList.add('is-open');
};

document.addEventListener('click', (e) => {
    if (!e.target.closest?.('.intake-dropdown')) closeIntakeBrandMenu();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeIntakeBrandMenu();
});

window.updateIntakeComplaintCount = function () {
    const field = document.getElementById('in_complaint');
    const count = document.getElementById('in_complaint_count');
    if (!field || !count) return;
    count.textContent = `${field.value.length} / 500`;
};

function paintIntakeIcons() {
    document.querySelectorAll('#modal-intake [data-icon]').forEach((slot) => {
        if (slot.dataset.filled === '1') return;
        slot.innerHTML = icon(slot.dataset.icon);
        slot.dataset.filled = '1';
    });
}

var intakeEditJobId = null;

function setIntakeMode(mode) {
    const title = document.getElementById('intakeTitle');
    const sub = document.getElementById('intakeSub');
    const submit = document.getElementById('intakeSubmitLabel');
    if (mode === 'edit') {
        if (title) title.textContent = 'Edit details';
        if (sub) sub.textContent = 'Correct the intake info if the front desk typed it wrong.';
        if (submit) submit.textContent = 'Save details';
        return;
    }
    if (title) title.textContent = 'Register New Intake';
    if (sub) sub.textContent = 'Fill in the details below to create a new intake record.';
    if (submit) submit.textContent = 'Register Intake';
}

function resetIntakeForm() {
    document.querySelector('#modal-intake .intake-form')?.reset();
    toggleOtherBrand();
    updateIntakeComplaintCount();
}

function intakeFormPayload() {
    const brandChoice = document.getElementById('in_brand').value;
    const brand = brandChoice === 'Others'
        ? document.getElementById('in_brand_other').value.trim()
        : brandChoice;

    return {
        brand,
        customer: document.getElementById('in_cust').value.toLowerCase().trim(),
        moto: `${brand} ${document.getElementById('in_moto').value.trim()}`.trim(),
        plate: document.getElementById('in_plate').value.trim().toUpperCase(),
        dateIn: document.getElementById('in_date').value,
        timeIn: document.getElementById('in_time').value.slice(0, 5),
        complaint: document.getElementById('in_complaint').value.trim(),
    };
}

function intakePlateTaken(plate, exceptId) {
    return dbJobs.some(job =>
        job.plate_number === plate
        && job.stage !== 'Release'
        && String(job.id) !== String(exceptId || '')
    );
}

window.openIntake = function () {
    intakeEditJobId = null;
    setIntakeMode('create');
    resetIntakeForm();

    const dateField = document.getElementById('in_date');
    if (dateField) {
        dateField.value = toISODate();
        dateField.max = toISODate();
    }
    const timeField = document.getElementById('in_time');
    if (timeField) {
        const now = new Date();
        timeField.value = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    }
    paintIntakeIcons();
    closeIntakeBrandMenu();
    buildIntakeBrandMenu();
    syncIntakeBrandMark();
    updateIntakeComplaintCount();
    openModal('modal-intake');
};

window.submitIntakeForm = async function (e) {
    e.preventDefault();
    if (intakeEditJobId) {
        await submitEditJobDetails(e);
        return;
    }
    await submitIntake(e);
};

window.submitIntake = async function (e) {
    e.preventDefault();
    const payload = intakeFormPayload();
    if (!payload.brand) {
        showNotification('Please enter the motorcycle brand.', 'error');
        return;
    }

    if (intakePlateTaken(payload.plate)) {
        showNotification(`Error: Plate number ${payload.plate} is already active.`, 'error');
        return;
    }

    try {
        const response = await apiFetch('/api/jobs', { method: 'POST', body: JSON.stringify(payload) });

        if (response.ok) {
            resetIntakeForm();
            closeModal('modal-intake');
            showNotification('Intake successfully registered!', 'success');
            invalidate('jobs');
            invalidate('released');
            await loadView('kanban');
        } else {
            const data = await response.json().catch(() => ({}));
            showNotification(data.message || 'Error saving to database.', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};

window.moveStage = async function (id, nextStage) {
    const job = dbJobs.find(j => String(j.id) === String(id));
    const sendingBack = job && job.stage === 'QA' && nextStage === 'Tuning';
    if (job && !sendingBack && stageNeedsLeadTech(job.stage) && !jobHasLeadTech(job)) {
        showNotification('Assign a lead tech before moving this unit.', 'error');
        return;
    }

    try {
        const response = await apiFetch(`/api/jobs/${id}/stage`, {
            method: 'PUT',
            body: JSON.stringify({ stage: nextStage }),
        });

        if (response.ok) {
            showNotification(`Moved to ${nextStage}`, 'success');
            invalidate('jobs');
            invalidate('released');
            await loadView('kanban');
        } else {
            showNotification(await serverMessage(response, 'Error moving job in database.'), 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};

window.assignMechanic = async function (id, mechanicName) {
    try {
        const response = await apiFetch(`/api/jobs/${id}/mechanic`, {
            method: 'PUT',
            body: JSON.stringify({ mechanic: mechanicName }),
        });

        if (response.ok) {
            showNotification(mechanicName ? `Assigned to ${mechanicName}` : 'Mechanic unassigned', 'success');
            invalidate('jobs');
            invalidate('released');
            await loadView('kanban');
        } else {
            showNotification(await serverMessage(response, 'Error saving mechanic to database.'), 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};

function splitMotoModel(moto) {
    const text = String(moto || '').trim();
    if (!text) return { brand: 'Honda', other: '', model: '' };

    const known = MOTO_BRANDS.find(b => {
        const key = b.toLowerCase();
        const value = text.toLowerCase();
        return value === key || value.startsWith(key + ' ');
    });
    if (known) {
        return { brand: known, other: '', model: text.slice(known.length).trim() };
    }

    const space = text.indexOf(' ');
    if (space > 0) {
        return { brand: 'Others', other: text.slice(0, space), model: text.slice(space + 1).trim() };
    }
    return { brand: 'Others', other: text, model: '' };
}

window.openEditJobDetails = function (id) {
    const job = dbJobs.find(j => String(j.id) === String(id));
    if (!job || currentRole !== 'staff' || job.stage !== 'Disassembly') return;

    intakeEditJobId = job.id;
    setIntakeMode('edit');
    resetIntakeForm();

    const parts = splitMotoModel(job.moto_model);
    const brandSelect = document.getElementById('in_brand');
    if (brandSelect) brandSelect.value = parts.brand;
    toggleOtherBrand();
    if (parts.brand === 'Others') {
        document.getElementById('in_brand_other').value = parts.other;
    }

    document.getElementById('in_cust').value = job.customer || '';
    document.getElementById('in_moto').value = parts.model;
    document.getElementById('in_plate').value = job.plate_number || '';
    document.getElementById('in_complaint').value = job.complaint || '';

    const dateField = document.getElementById('in_date');
    if (dateField) {
        dateField.max = toISODate();
        dateField.value = job.date_in || toISODate();
    }
    const timeField = document.getElementById('in_time');
    if (timeField) {
        timeField.value = String(job.time_in || '09:00').slice(0, 5);
    }

    paintIntakeIcons();
    closeIntakeBrandMenu();
    buildIntakeBrandMenu();
    syncIntakeBrandMark();
    updateIntakeComplaintCount();
    openModal('modal-intake');
};

window.submitEditJobDetails = async function (e) {
    e.preventDefault();
    const id = intakeEditJobId;
    const payload = intakeFormPayload();
    if (!id) return;
    if (!payload.brand) {
        showNotification('Please enter the motorcycle brand.', 'error');
        return;
    }

    if (intakePlateTaken(payload.plate, id)) {
        showNotification(`Error: Plate number ${payload.plate} is already active.`, 'error');
        return;
    }

    try {
        const response = await apiFetch(`/api/jobs/${id}/details`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            intakeEditJobId = null;
            setIntakeMode('create');
            resetIntakeForm();
            closeModal('modal-intake');
            showNotification('Details updated.', 'success');
            invalidate('jobs');
            invalidate('released');
            await loadView('kanban');
        } else {
            showNotification(await serverMessage(response, 'Could not update those details.'), 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};

window.openChangeMechanic = function (id) {
    const job = dbJobs.find(j => String(j.id) === String(id));
    if (!job || currentRole !== 'staff') return;

    const list = document.getElementById('changeMechList');
    const copy = document.getElementById('changeMechCopy');
    const names = dbMechanics.map(m => m.name);
    copy.textContent = job.mechanic_name
        ? `Currently ${job.mechanic_name}. Pick the lead tech for this unit.`
        : 'Pick the lead tech for this unit.';

    if (names.length === 0) {
        list.innerHTML = '<p class="mech-pick-empty">Ask an admin to add technicians first.</p>';
    } else {
        list.innerHTML = names.map(name => {
            const current = name === job.mechanic_name;
            return `<button type="button" class="mech-pick${current ? ' is-current' : ''}"
                        data-id="${esc(String(job.id))}" data-name="${esc(name)}"
                        onclick="pickKanbanMechanic(this.dataset.id, this.dataset.name)">
                        ${esc(name)}${current ? '<span>Current</span>' : ''}
                    </button>`;
        }).join('');
    }

    openModal('modal-change-mechanic');
};

window.pickKanbanMechanic = async function (id, name) {
    closeModal('modal-change-mechanic');
    await assignMechanic(id, name);
};

window.deleteJob = async function (id) {
    if (!confirm('Are you sure you want to cancel and delete this job from the database?')) return;

    try {
        const response = await apiFetch(`/api/jobs/${id}`, { method: 'DELETE' });

        if (response.ok) {
            showNotification('Job permanently deleted.', 'success');
            invalidate('jobs');
            invalidate('released');
            await loadView('kanban');
        } else {
            showNotification(await serverMessage(response, 'Error deleting job.'), 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};

// ------------------------------------------------------------
// Tuning specs & billing
// ------------------------------------------------------------

window.openSpecs = function (id) {
    const job = dbJobs.find(j => String(j.id) === String(id));
    if (job && !jobHasLeadTech(job)) {
        showNotification('Change the mechanic from the card menu before logging specs.', 'error');
        return;
    }

    document.getElementById('spec_job_id').value = id;
    paintSpecsIcons();

    const slot = document.getElementById('spec_warranty_proof');
    if (job && slot) {
        // Coverage lives on earlier Released visits, which are not on the
        // floor cache — check the same plate across active + released jobs.
        const earlier = allShopJobs().filter(j =>
            j.plate_number === job.plate_number && String(j.id) !== String(job.id)
        );
        const state = unitWarrantyState(earlier);
        const claim = state.state === 'active'
            ? `<div class="specs-claim-note">
                    <strong>Re-Service Warranty Claim</strong>
                    <small>Free of Charge</small>
               </div>`
            : '';
        slot.innerHTML = `
            <div class="specs-warranty-copy">
                <span class="specs-warranty-ico">${icon('shield')}</span>
                ${warrantyProofCard(state)}
            </div>
            ${claim ? `<span class="specs-warranty-split" aria-hidden="true"></span>${claim}` : ''}
        `;
        slot.classList.toggle('has-claim', state.state === 'active');
    } else if (slot) {
        slot.innerHTML = '';
        slot.classList.remove('has-claim');
    }

    openModal('modal-specs');
};

function paintSpecsIcons() {
    document.querySelectorAll('#modal-specs [data-icon]').forEach((slot) => {
        if (slot.dataset.filled === '1') return;
        slot.innerHTML = icon(slot.dataset.icon);
        slot.dataset.filled = '1';
    });
}

// Show the free-text suspension brand field only when "Others" is selected.
window.toggleOtherSuspensionBrand = function () {
    const isOther = document.getElementById('spec_susp_brand').value === 'Others';
    const group = document.getElementById('otherSuspBrandGroup');
    const input = document.getElementById('spec_susp_brand_other');
    group.classList.toggle('hidden', !isOther);
    input.required = isOther;
    if (!isOther) input.value = '';
};

window.submitSpecs = async function (e) {
    e.preventDefault();
    const jobId = document.getElementById('spec_job_id').value;

    const enginePrice = parseInt(document.getElementById('spec_engine').value) || 1500;
    const oil = document.getElementById('spec_oil').value;
    const springs = document.getElementById('spec_springs').value;
    const osSize = document.getElementById('spec_oil_seal').value;
    const osQty = parseInt(document.getElementById('spec_oil_seal_qty').value) || 0;
    const osSide = document.getElementById('spec_oil_seal_side').value;
    const dsSize = document.getElementById('spec_dust_seal').value;
    const dsQty = parseInt(document.getElementById('spec_dust_seal_qty').value) || 0;
    const dsSide = document.getElementById('spec_dust_seal_side').value;

    if ((osSize !== 'None' && osQty === 0) || (dsSize !== 'None' && dsQty === 0)) {
        showNotification('Specify quantity for seals.', 'error');
        return;
    }

    // Suspension setup: brand comes from the dropdown, or the manual field
    // when "Others" is selected.
    const suspBrandChoice = document.getElementById('spec_susp_brand').value;
    const suspensionBrand = suspBrandChoice === 'Others'
        ? document.getElementById('spec_susp_brand_other').value.trim()
        : suspBrandChoice;

    if (!suspensionBrand) {
        showNotification('Please enter the suspension brand.', 'error');
        return;
    }

    const payload = {
        enginePrice: enginePrice,
        oil: oil,
        oilSeal: osSize !== 'None' ? `${osSize} (${osQty} - ${osSide})` : 'None',
        dustSeal: dsSize !== 'None' ? `${dsSize} (${dsQty} - ${dsSide})` : 'None',
        springs: springs,

        // The measured suspension setup, logged per visit
        oilViscosity: document.getElementById('spec_oil_viscosity').value,
        suspensionBrand: suspensionBrand,
        suspensionType: document.getElementById('spec_susp_type').value,

        // Raw values so the backend can deduct inventory
        rawOil: oil,
        rawOsSize: osSize,
        rawOsQty: osQty,
        rawDsSize: dsSize,
        rawDsQty: dsQty,
        rawSprings: springs,
    };

    try {
        const response = await apiFetch(`/api/jobs/${jobId}/specs`, { method: 'PUT', body: JSON.stringify(payload) });

        if (response.ok) {
            const data = await response.json().catch(() => ({}));
            const billedJob = data.job;
            const billedTotal = billedJob?.specs?.totalBill ?? 0;
            if (billedJob) {
                const idx = dbJobs.findIndex(j => String(j.id) === String(jobId));
                if (idx >= 0) dbJobs[idx] = billedJob;
                else dbJobs.push(billedJob);
            }
            e.target.reset();
            toggleOtherSuspensionBrand(); // re-hide the "Others" field after the reset
            closeModal('modal-specs');
            showNotification(`Specs logged. Bill: ₱${Number(billedTotal).toLocaleString()}`, 'success');
            invalidate('inventory');
            invalidate('jobs');
            invalidate('released');
            await loadView('kanban');
            openBillDetail(jobId);
        } else {
            showNotification(await serverMessage(response, 'Error logging specs.'), 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};
