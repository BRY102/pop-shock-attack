// ============================================================
// MotoTrack — Warranty records
// One row per plate, taken from the released job that currently
// covers that unit. Coverage still starts on first Release.
// ============================================================

var warrantyQuery = '';
var warrantyStatus = 'all';
var warrantyBrand = 'all';
var warrantyFrom = '';
var warrantyTo = '';

const WARRANTY_SOON_DAYS = 30;

const WARRANTY_KIND_LABEL = {
    active: 'Active',
    'expiring-soon': 'Expiring Soon',
    expired: 'Expired',
};

function motoBrandName(model) {
    const text = String(model || '').toLowerCase();
    return MOTO_BRANDS.find(brand => text.includes(brand.toLowerCase())) || 'Others';
}

function daysUntilIso(iso) {
    const [y, m, d] = String(iso || '').split('-').map(Number);
    if (!y || !m || !d) return null;
    const end = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((end - today) / 86400000);
}

function warrantyKindOf(expires) {
    const days = daysUntilIso(expires);
    if (days == null) return 'expired';
    if (days < 0) return 'expired';
    if (days <= WARRANTY_SOON_DAYS) return 'expiring-soon';
    return 'active';
}

function warrantyNumber(job, start) {
    const year = String(start || job?.date_released || job?.date_in || toISODate()).slice(0, 4) || '0000';
    const id = String(job?.id ?? 0).padStart(4, '0');
    return `WRN-${year}-${id}`;
}

function coveringJobForPlate(jobs) {
    return [...jobs].sort((a, b) => {
        const byExpiry = String(b.warranty_expires_at || '').localeCompare(String(a.warranty_expires_at || ''));
        if (byExpiry !== 0) return byExpiry;
        const aStart = String(a.date_released || a.date_in || '');
        const bStart = String(b.date_released || b.date_in || '');
        return aStart.localeCompare(bStart);
    })[0];
}

function warrantyRecords() {
    const groups = new Map();
    (dbReleased || []).forEach(job => {
        if (!job?.warranty_expires_at || !job.plate_number) return;
        const plate = String(job.plate_number);
        const list = groups.get(plate) || [];
        list.push(job);
        groups.set(plate, list);
    });

    return [...groups.values()].map(jobs => {
        const job = coveringJobForPlate(jobs);
        const start = job.date_released || job.date_in || '';
        const expiry = job.warranty_expires_at;
        return {
            job,
            number: warrantyNumber(job, start),
            customer: displayName(job.customer),
            moto: job.moto_model || '—',
            plate: job.plate_number,
            brand: motoBrandName(job.moto_model),
            start,
            expiry,
            kind: warrantyKindOf(expiry),
        };
    }).sort((a, b) => String(b.expiry).localeCompare(String(a.expiry))
        || String(b.number).localeCompare(String(a.number)));
}

function visibleWarrantyRecords() {
    const needle = warrantyQuery.trim().toLowerCase();
    return warrantyRecords().filter(row => {
        if (warrantyStatus !== 'all' && row.kind !== warrantyStatus) return false;
        if (warrantyBrand !== 'all' && row.brand !== warrantyBrand) return false;
        if (warrantyFrom && String(row.expiry) < warrantyFrom) return false;
        if (warrantyTo && String(row.start || row.expiry) > warrantyTo) return false;
        if (!needle) return true;
        const hay = `${row.number} ${row.customer} ${row.moto} ${row.plate} ${row.brand}`.toLowerCase();
        return hay.includes(needle);
    });
}

function warrantyBrandOptions() {
    const brands = [...new Set(warrantyRecords().map(row => row.brand))].sort();
    return ['all', ...brands];
}

function warrantyStatusHtml(kind) {
    const label = WARRANTY_KIND_LABEL[kind] || 'Expired';
    return `<span class="wrn-status is-${esc(kind)}"><i></i>${esc(label)}</span>`;
}

function warrantyRowMenu(row) {
    const id = esc(String(row.job.id));
    const plate = esc(row.plate);
    const billItems = row.job.specs
        ? `<button type="button" role="menuitem" onclick="closeRowMenus(); openBillDetail('${id}')">
                ${icon('receipt')} View bill
           </button>
           <button type="button" role="menuitem" onclick="closeRowMenus(); printReceipt('${id}')">
                ${icon('printer')} Print
           </button>`
        : '';

    return `
        <td class="row-menu-cell">
            <div class="row-menu-wrap">
                <button type="button" class="row-menu-btn" onclick="toggleRowMenu(event, 'wrn-${id}')"
                        aria-haspopup="true" aria-expanded="false" aria-label="Actions for ${plate}">
                    ${icon('ellipsis')}
                </button>
                <div class="row-menu hidden" id="rowMenu-wrn-${id}" role="menu">
                    <button type="button" role="menuitem" data-plate="${esc(row.plate)}"
                            onclick="closeRowMenus(); openWarrantyInHistory(this.dataset.plate)">
                        ${icon('calendar-clock')} Open in History
                    </button>
                    ${billItems}
                </div>
            </div>
        </td>`;
}

function warrantyRowsHtml() {
    const rows = visibleWarrantyRecords();
    if (rows.length === 0) {
        const message = warrantyRecords().length === 0
            ? 'No warranty records yet. Coverage starts when a unit is first released.'
            : 'No records match these filters.';
        return `<tr><td colspan="8" class="table-empty">${message}</td></tr>`;
    }

    return rows.map(row => `
        <tr>
            <td class="wrn-mark-cell">
                <span class="wrn-shield is-${esc(row.kind)}" aria-hidden="true">${icon('shield')}</span>
            </td>
            <td class="cell-keep"><span class="cell-title">${esc(row.number)}</span></td>
            <td class="cell-keep"><span class="cell-title">${esc(row.customer)}</span></td>
            <td>
                <span class="cell-title">${esc(row.moto)}</span>
                <span class="cell-sub">${esc(row.plate)}</span>
            </td>
            <td>${esc(row.brand)}</td>
            <td>${esc(prettyDate(row.start))}</td>
            <td>${esc(prettyDate(row.expiry))}</td>
            <td>${warrantyStatusHtml(row.kind)}</td>
            ${warrantyRowMenu(row)}
        </tr>`).join('');
}

function refreshWarrantyList() {
    const body = document.getElementById('wrnTableBody');
    const meta = document.getElementById('wrnTotal');
    if (body) body.innerHTML = warrantyRowsHtml();
    if (meta) {
        const n = visibleWarrantyRecords().length;
        meta.textContent = `Total Records: ${n}`;
    }
}

window.readWarrantyFilters = function () {
    closeWarrantyMenus();
    warrantyQuery = document.getElementById('wrnSearch')?.value || '';
    warrantyFrom = document.getElementById('wrnFrom')?.value || '';
    warrantyTo = document.getElementById('wrnTo')?.value || '';
    refreshWarrantyList();
};

window.openWarrantyInHistory = function (plate) {
    window.pendingHistoryQuery = plate;
    loadView('history');
};

const WARRANTY_STATUS_OPTIONS = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'expiring-soon', label: 'Expiring Soon' },
    { value: 'expired', label: 'Expired' },
];

function warrantyStatusLabel() {
    return WARRANTY_STATUS_OPTIONS.find(opt => opt.value === warrantyStatus)?.label || 'All Status';
}

function warrantyBrandLabel() {
    return warrantyBrand === 'all' ? 'All Brands' : warrantyBrand;
}

function warrantySelectOptions(kind) {
    if (kind === 'status') return WARRANTY_STATUS_OPTIONS;
    return warrantyBrandOptions().map(brand => ({
        value: brand,
        label: brand === 'all' ? 'All Brands' : brand,
    }));
}

function warrantyMenuHtml(kind) {
    const current = kind === 'status' ? warrantyStatus : warrantyBrand;
    return `
        <div class="wrn-menu" role="listbox" aria-label="${kind === 'status' ? 'Status' : 'Brand'}">
            ${warrantySelectOptions(kind).map(opt => {
                const on = opt.value === current;
                const dot = kind === 'status' && opt.value !== 'all'
                    ? `<i class="wrn-dot is-${esc(opt.value)}"></i>`
                    : '';
                return `<button type="button" role="option" class="${on ? 'is-on' : ''}"
                            data-kind="${esc(kind)}" data-value="${esc(opt.value)}"
                            aria-selected="${on ? 'true' : 'false'}"
                            onclick="event.stopPropagation(); pickWarrantyFilter(this.dataset.kind, this.dataset.value)">
                            <span>${dot}${esc(opt.label)}</span>
                            ${on ? icon('check') : ''}
                        </button>`;
            }).join('')}
        </div>`;
}

window.closeWarrantyMenus = function () {
    document.querySelectorAll('.wrn-select-wrap.is-open').forEach((wrap) => {
        wrap.classList.remove('is-open');
        wrap.querySelector('.wrn-select')?.setAttribute('aria-expanded', 'false');
        wrap.querySelector('.wrn-menu')?.remove();
    });
};

window.toggleWarrantyMenu = function (e, kind) {
    e.preventDefault();
    e.stopPropagation();
    const wrap = e.currentTarget.closest('.wrn-select-wrap');
    if (!wrap) return;
    const wasOpen = wrap.classList.contains('is-open');
    closeWarrantyMenus();
    if (wasOpen) return;
    wrap.classList.add('is-open');
    e.currentTarget.setAttribute('aria-expanded', 'true');
    wrap.insertAdjacentHTML('beforeend', warrantyMenuHtml(kind));
};

window.pickWarrantyFilter = function (kind, value) {
    if (kind === 'status') warrantyStatus = value || 'all';
    if (kind === 'brand') warrantyBrand = value || 'all';
    const btn = document.getElementById(kind === 'status' ? 'wrnStatusBtn' : 'wrnBrandBtn');
    if (btn) {
        btn.innerHTML = `<em>${esc(kind === 'status' ? warrantyStatusLabel() : warrantyBrandLabel())}</em>${icon('chevron-down')}`;
    }
    closeWarrantyMenus();
    refreshWarrantyList();
};

function warrantySelectHtml(kind, fieldLabel, buttonId, currentLabel) {
    return `
        <div class="wrn-field wrn-select-wrap">
            <span class="wrn-field-label">${esc(fieldLabel)}</span>
            <button type="button" class="wrn-select" id="${esc(buttonId)}"
                    onclick="toggleWarrantyMenu(event, '${esc(kind)}')"
                    aria-haspopup="listbox" aria-expanded="false"
                    aria-label="${esc(fieldLabel)}">
                <em>${esc(currentLabel)}</em>
                ${icon('chevron-down')}
            </button>
        </div>`;
}

function renderWarranty(ctx) {
    ctx.title.innerText = 'Warranty';
    ctx.desc.innerText = 'Coverage on released units.';
    ctx.actions.innerHTML = '';

    ctx.content.innerHTML = `
        <div class="wrn-filters">
            <div class="list-search wrn-search">
                ${icon('search')}
                <input type="search" id="wrnSearch"
                       placeholder="Search by customer, motorcycle, or warranty #"
                       value="${esc(warrantyQuery)}"
                       oninput="readWarrantyFilters()">
            </div>
            ${warrantySelectHtml('status', 'Status', 'wrnStatusBtn', warrantyStatusLabel())}
            ${warrantySelectHtml('brand', 'Brand', 'wrnBrandBtn', warrantyBrandLabel())}
            <div class="wrn-dates">
                <span class="wrn-field-label">Date range</span>
                <div class="filter-group">
                    <input type="date" id="wrnFrom" class="date-filter" aria-label="From date"
                           value="${esc(warrantyFrom)}" onchange="readWarrantyFilters()">
                    <span class="filter-sep"></span>
                    <input type="date" id="wrnTo" class="date-filter" aria-label="To date"
                           value="${esc(warrantyTo)}" onchange="readWarrantyFilters()">
                </div>
            </div>
        </div>

        <div class="list-card wrn-card">
            <div class="list-toolbar">
                <div class="wrn-card-title">${icon('shield-check')} Warranty Records</div>
                <span class="section-meta" id="wrnTotal">Total Records: 0</span>
            </div>
            <div class="table-container table-flush table-scroll">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th class="wrn-mark-cell"><span class="sr-only">Coverage</span></th>
                            <th class="cell-keep">Warranty #</th>
                            <th class="cell-keep">Customer</th>
                            <th>Motorcycle</th>
                            <th>Brand</th>
                            <th>Start Date</th>
                            <th>Expiry Date</th>
                            <th>Status</th>
                            <th><span class="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody id="wrnTableBody"></tbody>
                </table>
            </div>
        </div>`;

    refreshWarrantyList();
}
