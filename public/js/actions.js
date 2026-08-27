// ============================================================
// MotoTrack — User actions (forms + mutations)
// Every handler posts to the API, re-syncs the caches, then
// re-renders the relevant view.
// ============================================================

// The API rejects business-rule violations (stage order, insufficient stock,
// warranty eligibility) with an explanatory message. Show that instead of a
// generic failure, so staff know what to do next.
async function serverMessage(response, fallback) {
    const data = await response.json().catch(() => ({}));
    return data.message || fallback;
}

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
};

window.openIntake = function () {
    const dateField = document.getElementById('in_date');
    if (dateField) {
        dateField.value = toISODate();
        dateField.max = toISODate();
    }
    openModal('modal-intake');
};

window.submitIntake = async function (e) {
    e.preventDefault();
    const plate = document.getElementById('in_plate').value.trim().toUpperCase();

    // A unit can only be in the shop once at a time
    if (dbJobs.some(job => job.plate_number === plate && job.stage !== 'Release')) {
        showNotification(`Error: Plate number ${plate} is already active.`, 'error');
        return;
    }

    // Brand comes from the dropdown, or the manual field when "Others"
    const brandChoice = document.getElementById('in_brand').value;
    const brand = brandChoice === 'Others'
        ? document.getElementById('in_brand_other').value.trim()
        : brandChoice;

    if (!brand) {
        showNotification('Please enter the motorcycle brand.', 'error');
        return;
    }

    const payload = {
        customer: document.getElementById('in_cust').value.toLowerCase().trim(),
        // Stored as "<Brand> <Model>" — the brand chart groups by the first word
        moto: `${brand} ${document.getElementById('in_moto').value.trim()}`.trim(),
        plate: plate,
        dateIn: document.getElementById('in_date').value,
        complaint: document.getElementById('in_complaint').value.trim(),
    };

    try {
        const response = await apiFetch('/api/jobs', { method: 'POST', body: JSON.stringify(payload) });

        if (response.ok) {
            e.target.reset();
            toggleOtherBrand(); // re-hide the "Others" field after the reset
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
    document.getElementById('spec_job_id').value = id;
    const claimBox = document.getElementById('spec_is_warranty');
    claimBox.checked = false;

    const job = dbJobs.find(j => String(j.id) === String(id));
    const slot = document.getElementById('spec_warranty_proof');
    if (job && slot) {
        // Coverage lives on earlier Released visits, which are not on the
        // floor cache — check the same plate across active + released jobs.
        const earlier = allShopJobs().filter(j =>
            j.plate_number === job.plate_number && String(j.id) !== String(job.id)
        );
        const state = unitWarrantyState(earlier);
        slot.innerHTML = warrantyProofCard(state);
        claimBox.disabled = state.state !== 'active';
        claimBox.title = state.state === 'active'
            ? 'This unit is still under warranty.'
            : 'No active warranty on this plate — cannot bill as a free claim.';
    } else if (slot) {
        slot.innerHTML = '';
        claimBox.disabled = false;
        claimBox.title = '';
    }

    openModal('modal-specs');
};

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
    const isWarranty = document.getElementById('spec_is_warranty').checked;
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
        isWarranty: isWarranty,

        // The measured suspension setup, logged per visit
        oilViscosity: document.getElementById('spec_oil_viscosity').value,
        suspensionBrand: suspensionBrand,
        suspensionType: document.getElementById('spec_susp_type').value,
        springRate: document.getElementById('spec_spring_rate').value,

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
            const billedTotal = data.job?.specs?.totalBill ?? 0;
            e.target.reset();
            toggleOtherSuspensionBrand(); // re-hide the "Others" field after the reset
            closeModal('modal-specs');
            showNotification(`Specs logged. Bill: ₱${Number(billedTotal).toLocaleString()}`, 'success');
            invalidate('inventory');
            invalidate('jobs');
            invalidate('released');
            await loadView('kanban');
        } else {
            showNotification(await serverMessage(response, 'Error logging specs.'), 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};

// ------------------------------------------------------------
// Inventory items
// ------------------------------------------------------------

// Where to go after a successful save. The Inventory page wants to stay put;
// the Overview quick action should not throw the owner onto another screen.
let itemModalReturnView = 'inventory';

window.openItemModal = function (mode, id = null, returnView = 'inventory') {
    itemModalReturnView = returnView;
    document.getElementById('edit_item_mode').value = mode;
    const modal = document.getElementById('modal-edit-item');
    const form = modal.querySelector('form');

    if (mode === 'add') {
        document.getElementById('itemModalTitle').innerText = 'Add New Item';
        form.reset();
    } else {
        document.getElementById('itemModalTitle').innerText = 'Edit Item';
        const item = dbInv.find(i => i.id === id);

        if (!item) {
            showNotification('Error: Could not load item data.', 'error');
            return;
        }

        document.getElementById('edit_item_id').value = item.id;
        document.getElementById('m_item_name').value = item.name;
        document.getElementById('m_item_desc').value = item.description || '';
        document.getElementById('m_item_stock').value = item.stock || 0;
        document.getElementById('m_item_threshold').value = item.threshold || 0;
        document.getElementById('m_item_price').value = item.price || 0;
    }

    modal.classList.remove('hidden');
};

window.submitItemForm = async function (e) {
    e.preventDefault();
    const mode = document.getElementById('edit_item_mode').value;

    const payload = {
        name: document.getElementById('m_item_name').value.trim(),
        description: document.getElementById('m_item_desc').value,
        stock: parseInt(document.getElementById('m_item_stock').value) || 0,
        threshold: parseInt(document.getElementById('m_item_threshold').value) || 0,
        price: parseFloat(document.getElementById('m_item_price').value) || 0,
    };

    try {
        let response;
        if (mode === 'add') {
            // New items get a random 6-digit item number
            payload.item_no = String(Math.floor(Math.random() * 900000) + 100000);
            response = await apiFetch('/api/inventory', { method: 'POST', body: JSON.stringify(payload) });
        } else {
            const id = document.getElementById('edit_item_id').value;
            response = await apiFetch(`/api/inventory/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        }

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to save item.');
        }

        closeModal('modal-edit-item');
        showNotification(mode === 'add' ? 'New item saved to database.' : 'Item updated in database.', 'success');
        invalidate('inventory');
        await loadView(itemModalReturnView);
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
};

window.openAddStockModal = function (id) {
    const item = dbInv.find(i => i.id === id);
    if (!item) {
        showNotification('Error: Could not load item data.', 'error');
        return;
    }

    document.getElementById('add_stock_item_id').value = item.id;
    document.getElementById('add_stock_item_name').innerText = item.name;
    document.getElementById('add_stock_qty').value = 10;
    openModal('modal-add-stock');
};

window.submitAddStock = async function (e) {
    e.preventDefault();
    const id = document.getElementById('add_stock_item_id').value;
    const qty = parseInt(document.getElementById('add_stock_qty').value);
    if (isNaN(qty) || qty <= 0) return;

    try {
        const response = await apiFetch(`/api/inventory/${id}/add-stock`, {
            method: 'PUT',
            body: JSON.stringify({ qty }),
        });

        if (response.ok) {
            closeModal('modal-add-stock');
            showNotification(`Added ${qty} units.`, 'success');
            invalidate('inventory');
            await loadView('inventory');
        } else {
            showNotification(await serverMessage(response, 'Error adding stock.'), 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};

window.deleteItem = async function (id) {
    const item = dbInv.find(i => i.id === id);
    const label = item ? item.name : 'this item';
    if (!confirm(`Are you sure you want to delete "${label}"? This action cannot be undone.`)) return;

    try {
        const response = await apiFetch(`/api/inventory/${id}`, { method: 'DELETE' });

        if (response.ok) {
            showNotification('Item successfully deleted.', 'success');
            invalidate('inventory');
            await loadView('inventory');
        } else {
            showNotification('Error deleting item.', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};

// ------------------------------------------------------------
// User accounts
// ------------------------------------------------------------

window.openUserModal = function (mode, id = null) {
    document.getElementById('edit_user_mode').value = mode;
    const form = document.getElementById('modal-manage-user').querySelector('form');
    const passwordInput = document.getElementById('m_password');

    if (mode === 'add') {
        document.getElementById('userModalTitle').innerText = 'Add User';
        form.reset();
        passwordInput.required = true;
        passwordInput.placeholder = `Minimum ${PASSWORD_MIN_LENGTH} characters`;
    } else {
        document.getElementById('userModalTitle').innerText = 'Edit User';
        const user = dbUsers.find(u => u.id === id);

        if (!user) {
            showNotification('Error: Could not load user data.', 'error');
            return;
        }

        document.getElementById('edit_user_id').value = user.id;
        document.getElementById('m_username').value = user.username;
        // Hashes are never sent to the browser; blank means "keep current password"
        passwordInput.value = '';
        passwordInput.required = false;
        passwordInput.placeholder = 'Leave blank to keep current password';
        document.getElementById('m_role').value = user.role;
    }

    openModal('modal-manage-user');
};

window.submitUserForm = async function (e) {
    e.preventDefault();
    const mode = document.getElementById('edit_user_mode').value;
    const username = document.getElementById('m_username').value.trim().toLowerCase();
    const password = document.getElementById('m_password').value;
    const role = document.getElementById('m_role').value;

    if (password && password.length < PASSWORD_MIN_LENGTH) {
        showNotification(`Error: Password must be at least ${PASSWORD_MIN_LENGTH} characters.`, 'error');
        return;
    }

    try {
        let response;
        if (mode === 'add') {
            response = await apiFetch('/api/users', {
                method: 'POST',
                body: JSON.stringify({ username, password, role }),
            });
        } else {
            const id = document.getElementById('edit_user_id').value;
            const payload = { username, role };
            if (password) payload.password = password;

            response = await apiFetch(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        }

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || 'Failed to save user.');
        }

        closeModal('modal-manage-user');
        showNotification('User saved to database.', 'success');
        invalidate('users');
        await loadView('users');
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
};

window.deleteUser = async function (id) {
    const user = dbUsers.find(u => u.id === id);
    const username = user ? user.username : 'this user';

    if (username === 'admin') {
        showNotification('Cannot delete main admin.', 'error');
        return;
    }
    if (!confirm(`Delete user ${username}?`)) return;

    try {
        const response = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });

        if (response.ok) {
            showNotification('User deleted.', 'success');
            invalidate('users');
        await loadView('users');
        } else {
            const data = await response.json().catch(() => ({}));
            showNotification(data.message || 'Error deleting user.', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};

window.openResetModal = function (id) {
    const reset = dbResets.find(r => r.id === id);
    if (!reset) {
        showNotification('Error: Could not load the reset request.', 'error');
        return;
    }

    document.getElementById('reset_request_id').value = reset.id;
    document.getElementById('reset_username').value = reset.username;
    document.getElementById('reset_password').value = '';
    document.getElementById('reset_password_confirm').value = '';
    openModal('modal-reset-password');
};

window.submitPasswordReset = async function (e) {
    e.preventDefault();

    const id = document.getElementById('reset_request_id').value;
    const password = document.getElementById('reset_password').value;
    const confirm = document.getElementById('reset_password_confirm').value;

    if (password !== confirm) {
        showNotification('Error: Passwords do not match.', 'error');
        return;
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
        showNotification(`Error: Password must be at least ${PASSWORD_MIN_LENGTH} characters.`, 'error');
        return;
    }

    try {
        const response = await apiFetch(`/api/password-resets/${id}/complete`, {
            method: 'PUT',
            body: JSON.stringify({ password }),
        });

        if (!response.ok) {
            showNotification(await serverMessage(response, 'Could not reset the password.'), 'error');
            return;
        }

        closeModal('modal-reset-password');
        showNotification('Password reset. Tell the rider the new password at the counter.', 'success');
        invalidate('resets');
        await loadView(currentRole === 'admin' ? 'users' : 'approvals');
    } catch (error) {
        showNotification('Server connection error.', 'error');
    }
};

window.submitMechanic = async function (e) {
    e.preventDefault();
    const name = document.getElementById('m_mechanic_name').value.trim();
    if (!name) return;

    try {
        const response = await apiFetch('/api/mechanics', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });

        if (!response.ok) {
            showNotification(await serverMessage(response, 'Could not add the mechanic.'), 'error');
            return;
        }

        e.target.reset();
        showNotification('Mechanic added. Staff can assign this name on the board.', 'success');
        invalidate('mechanics');
        await loadView('users');
    } catch (error) {
        showNotification('Server connection error.', 'error');
    }
};

window.deleteMechanic = async function (id) {
    const mechanic = dbMechanics.find(m => m.id === id);
    const name = mechanic ? mechanic.name : 'this mechanic';
    if (!confirm(`Remove ${name} from the assignment list?`)) return;

    try {
        const response = await apiFetch(`/api/mechanics/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showNotification('Mechanic removed.', 'success');
            invalidate('mechanics');
            await loadView('users');
        } else {
            showNotification(await serverMessage(response, 'Could not remove the mechanic.'), 'error');
        }
    } catch (error) {
        showNotification('Server connection error.', 'error');
    }
};

window.approveUser = async function (id) {
    try {
        const response = await apiFetch(`/api/users/${id}/approve`, { method: 'PUT' });

        if (response.ok) {
            showNotification('Account approved!', 'success');
            invalidate('users');
            await loadView('approvals');
        } else {
            showNotification('Error approving user.', 'error');
        }
    } catch (error) {
        showNotification('Server connection error.', 'error');
    }
};

// ------------------------------------------------------------
// Expenses
// ------------------------------------------------------------

window.submitExpense = async function (e) {
    e.preventDefault();
    const description = document.getElementById('exp_desc').value;
    const amount = parseFloat(document.getElementById('exp_amount').value);

    try {
        const response = await apiFetch('/api/expenses', {
            method: 'POST',
            body: JSON.stringify({ description, amount, date: toISODate() }),
        });

        if (response.ok) {
            e.target.reset();
            closeModal('modal-add-expense');
            showNotification('Expense recorded successfully.', 'success');
            invalidate('expenses');
            await loadView('overview');
        } else {
            showNotification('Error saving expense to database.', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};

// ------------------------------------------------------------
// Counter sales (walk-in income with no service job behind it)
// ------------------------------------------------------------

window.openCounterSaleModal = function () {
    const dateField = document.getElementById('sale_date');
    if (dateField) {
        dateField.value = toISODate();
        dateField.max = toISODate();
    }
    openModal('modal-add-sale');
};

window.submitCounterSale = async function (e) {
    e.preventDefault();
    const description = document.getElementById('sale_desc').value.trim();
    const amount = parseFloat(document.getElementById('sale_amount').value);
    const date = document.getElementById('sale_date').value;

    try {
        const response = await apiFetch('/api/counter-sales', {
            method: 'POST',
            body: JSON.stringify({ description, amount, date }),
        });

        if (response.ok) {
            e.target.reset();
            closeModal('modal-add-sale');
            showNotification('Counter sale recorded.', 'success');
            invalidate('counterSales');
            await loadView('overview');
        } else {
            showNotification(await serverMessage(response, 'Could not record the sale.'), 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};
