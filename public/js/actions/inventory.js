// ============================================================
// MotoTrack — Inventory actions
// Split from actions.js. Behavior unchanged.
// ============================================================

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
    const saveLabel = document.getElementById('itemEditSaveLabel');

    paintSheetIcons();

    if (mode === 'add') {
        document.getElementById('itemModalTitle').innerText = 'Add New Item';
        document.getElementById('itemModalSub').innerText = 'Add a consumable to the shop inventory.';
        form.reset();
        if (saveLabel) saveLabel.textContent = 'Save Item';
    } else {
        document.getElementById('itemModalTitle').innerText = 'Edit Item';
        document.getElementById('itemModalSub').innerText = "Update this item's stock and price.";
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
        if (saveLabel) saveLabel.textContent = 'Save Changes';
    }

    openModal('modal-edit-item');
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
