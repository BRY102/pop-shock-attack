// ============================================================
// MotoTrack — Inventory / consumables tracker
// Admin manages the catalog; staff get a read-only stock check.
// The list keeps its tab + search state so re-rendering after a
// stock change does not throw the user back to the top.
// ============================================================

let inventoryFilter = 'all';
let inventorySearch = '';

const INVENTORY_TABS = [
    { key: 'all', label: 'All items' },
    { key: 'low', label: 'Low stock' },
    { key: 'out', label: 'Out of stock' },
];

function isOutOfStock(item) {
    return Number(item.stock) === 0;
}

function isLowStock(item) {
    return Number(item.stock) <= Number(item.threshold);
}

function inventoryTabCount(key) {
    if (key === 'low') return dbInv.filter(item => isLowStock(item) && !isOutOfStock(item)).length;
    if (key === 'out') return dbInv.filter(isOutOfStock).length;
    return dbInv.length;
}

// Items for the active tab and search box, most urgent first so whatever
// needs restocking is what the owner sees without scrolling.
function visibleInventory() {
    const needle = inventorySearch.trim().toLowerCase();

    return dbInv
        .filter(item => {
            if (inventoryFilter === 'low' && !(isLowStock(item) && !isOutOfStock(item))) return false;
            if (inventoryFilter === 'out' && !isOutOfStock(item)) return false;
            if (!needle) return true;
            return `${item.name} ${item.description} ${item.item_no}`.toLowerCase().includes(needle);
        })
        .sort((a, b) => (Number(a.stock) - Number(a.threshold)) - (Number(b.stock) - Number(b.threshold)));
}

function inventoryStatusBadge(item) {
    if (isOutOfStock(item)) return `<span class="badge-low">OUT OF STOCK</span>`;
    if (isLowStock(item)) return `<span class="badge-low">LOW STOCK</span>`;
    return `<span class="badge-good">GOOD</span>`;
}

function inventoryRowMenu(item) {
    return `
        <td class="row-menu-cell">
            <div class="row-menu-wrap">
                <button class="row-menu-btn" onclick="toggleRowMenu(event, ${item.id})"
                        aria-haspopup="true" aria-expanded="false" aria-label="Actions for ${esc(item.name)}">
                    ${icon('ellipsis')}
                </button>
                <div class="row-menu hidden" id="rowMenu-${item.id}" role="menu">
                    <button role="menuitem" onclick="closeRowMenus(); openItemModal('edit', ${item.id})">
                        ${icon('pencil')} Edit
                    </button>
                    <button role="menuitem" onclick="closeRowMenus(); openAddStockModal(${item.id})">
                        ${icon('plus')} Add Stock
                    </button>
                    <button role="menuitem" class="is-danger" onclick="closeRowMenus(); deleteItem(${item.id})">
                        ${icon('trash')} Delete
                    </button>
                </div>
            </div>
        </td>`;
}

function inventoryRows() {
    const isAdmin = currentRole === 'admin';
    const items = visibleInventory();
    const columns = isAdmin ? 5 : 4;

    if (items.length === 0) {
        const message = dbInv.length === 0
            ? 'No stock items yet.'
            : 'No items match this view.';
        return `<tr><td colspan="${columns}" class="table-empty">${message}</td></tr>`;
    }

    return items.map(item => `
        <tr>
            <td>
                <div class="item-cell">
                    <span class="item-thumb">${icon('package')}</span>
                    <span class="item-lines">
                        <span class="item-name">${esc(item.name)}</span>
                        <span class="item-sub">${esc(item.description)} &middot; No. ${esc(item.item_no)}</span>
                    </span>
                </div>
            </td>
            <td>${peso(item.price)}</td>
            <td>
                <span class="stock-count${isLowStock(item) ? ' is-low' : ''}">${item.stock}</span>
                <span class="stock-unit">units</span>
                <span class="stock-alert">alerts at ${item.threshold}</span>
            </td>
            <td>${inventoryStatusBadge(item)}</td>
            ${isAdmin ? inventoryRowMenu(item) : ''}
        </tr>`).join('');
}

// Only the parts that change, so typing in the search box keeps focus.
function refreshInventoryList() {
    const body = document.getElementById('invTableBody');
    if (!body) return;

    body.innerHTML = inventoryRows();
    document.querySelectorAll('.list-tab').forEach(tab => {
        tab.classList.toggle('is-active', tab.dataset.tab === inventoryFilter);
    });
}

window.setInventoryFilter = function (key) {
    inventoryFilter = key;
    refreshInventoryList();
};

window.searchInventory = function (value) {
    inventorySearch = value;
    refreshInventoryList();
};

function renderInventory(ctx) {
    ctx.title.innerText = 'Inventory';
    ctx.desc.innerText = 'Stock and reorder levels.';

    const isAdmin = currentRole === 'admin';
    ctx.actions.innerHTML = isAdmin
        ? `<button class="btn btn-primary" onclick="openItemModal('add')">${icon('plus')} Add New Stock Item</button>`
        : '';

    const tabs = INVENTORY_TABS.map(tab => `
        <button class="list-tab${tab.key === inventoryFilter ? ' is-active' : ''}" data-tab="${tab.key}"
                onclick="setInventoryFilter('${tab.key}')">
            ${tab.label} <span class="list-tab-count">${inventoryTabCount(tab.key)}</span>
        </button>`).join('');

    ctx.content.innerHTML = `
        <div class="list-card">
            <div class="list-toolbar">
                <div class="list-tabs">${tabs}</div>
                <div class="list-search">
                    ${icon('search')}
                    <input type="search" id="invSearch" placeholder="Search items"
                           value="${esc(inventorySearch)}" oninput="searchInventory(this.value)">
                </div>
            </div>
            <div class="table-container table-flush"><table class="data-table">
                <thead><tr>
                    <th>Item</th><th>Price</th><th>Stock</th><th>Status</th>
                    ${isAdmin ? '<th><span class="sr-only">Actions</span></th>' : ''}
                </tr></thead>
                <tbody id="invTableBody">${inventoryRows()}</tbody>
            </table></div>
        </div>
    `;
}
