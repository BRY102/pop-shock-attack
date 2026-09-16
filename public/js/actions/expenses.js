// ============================================================
// MotoTrack — Expense and counter-sale actions
// Split from actions.js. Behavior unchanged.
// ============================================================

// ------------------------------------------------------------
// Expenses
// ------------------------------------------------------------

window.submitExpense = async function (e) {
    e.preventDefault();
    const description = document.getElementById('exp_desc').value.trim();
    const amount = parseFloat(document.getElementById('exp_amount').value);
    const date = document.getElementById('exp_date').value;
    const category = document.getElementById('exp_category').value;

    try {
        const response = await apiFetch('/api/expenses', {
            method: 'POST',
            body: JSON.stringify({ description, amount, date, category }),
        });

        if (response.ok) {
            e.target.reset();
            closeModal('modal-add-expense');
            showNotification('Expense recorded successfully.', 'success');
            invalidate('expenses');
            await loadView('overview');
        } else {
            const data = await response.json().catch(() => ({}));
            showNotification(data.message || 'Error saving expense to database.', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Server connection error.', 'error');
    }
};

window.openExpenseModal = function () {
    const today = toISODate();
    const dateField = document.getElementById('exp_date');
    if (dateField) {
        dateField.value = today;
        dateField.max = today;
    }
    const label = document.getElementById('exp_today_label');
    if (label) {
        const pretty = new Date(`${today}T00:00:00`).toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        });
        label.textContent = `Date: ${pretty}`;
    }
    const category = document.getElementById('exp_category');
    if (category) category.value = 'Utilities';
    const amount = document.getElementById('exp_amount');
    if (amount) amount.value = '';
    const notes = document.getElementById('exp_desc');
    if (notes) notes.value = '';
    document.querySelectorAll('#modal-add-expense .exp-label-icon[data-icon]').forEach(slot => {
        slot.innerHTML = icon(slot.dataset.icon);
    });
    openModal('modal-add-expense');
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
