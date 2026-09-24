// ============================================================
// MotoTrack — Transactions & Settlement Ledger
// Dedicated banking/POS-style transaction ledger for Admin & Staff.
// Shows all completed payments, methods (Cash/GCash), sukli,
// receipt references, and printable slips.
// ============================================================

var txnActiveMethodFilter = 'all';
var txnActiveDateFilter = 'all';

function renderTransactions(ctx) {
    ctx.title.innerText = 'Transactions';
    ctx.desc.innerText = 'Real-time record of all counter settlements and released services.';

    const releasedJobs = (dbReleased || []).filter(job => job.specs);
    const counterSales = dbCounterSales || [];

    // Combine both service releases and walk-in counter sales
    const allTxns = buildTransactionLedgerData(releasedJobs, counterSales);

    // Compute KPI metrics
    let totalCollected = 0;
    let totalCash = 0;
    let totalGcash = 0;
    let totalServices = 0;

    allTxns.forEach(tx => {
        totalCollected += tx.amount;
        if (tx.method === 'Cash') totalCash += tx.amount;
        else if (tx.method === 'GCash' || tx.method === 'Bank Transfer') totalGcash += tx.amount;
        if (tx.type === 'service') totalServices++;
    });

    let html = `
        <!-- Top KPI Cards -->
        <div class="txn-kpi-grid">
            <div class="txn-kpi-card">
                <div class="txn-kpi-ico is-money-in">
                    ${icon('banknote')}
                </div>
                <div class="txn-kpi-info">
                    <div class="txn-kpi-val">${peso(totalCollected)}</div>
                    <div class="txn-kpi-lbl">Total Volume Settled</div>
                </div>
            </div>
            <div class="txn-kpi-card">
                <div class="txn-kpi-ico is-cash">
                    ${icon('circle-dollar')}
                </div>
                <div class="txn-kpi-info">
                    <div class="txn-kpi-val">${peso(totalCash)}</div>
                    <div class="txn-kpi-lbl">Cash in Drawer</div>
                </div>
            </div>
            <div class="txn-kpi-card">
                <div class="txn-kpi-ico is-gcash">
                    ${icon('receipt')}
                </div>
                <div class="txn-kpi-info">
                    <div class="txn-kpi-val">${peso(totalGcash)}</div>
                    <div class="txn-kpi-lbl">Digital / E-Wallets</div>
                </div>
            </div>
            <div class="txn-kpi-card">
                <div class="txn-kpi-ico is-count">
                    ${icon('wrench')}
                </div>
                <div class="txn-kpi-info">
                    <div class="txn-kpi-val">${totalServices}</div>
                    <div class="txn-kpi-lbl">Units Released</div>
                </div>
            </div>
        </div>

        <!-- Toolbar: Search + Filter Pills -->
        <div class="txn-toolbar">
            <div class="txn-search-wrap">
                <span class="txn-search-ico" aria-hidden="true">${icon('search')}</span>
                <input type="text" id="txnSearchInput" class="txn-search-input"
                       placeholder="Search receipt #, plate, customer, or GCash ref..."
                       onkeyup="filterTransactionsLedger()">
            </div>
            <div class="txn-filter-pills">
                <button type="button" class="txn-pill-btn is-active" data-filter="all" onclick="setTxnMethodFilter('all', this)">All</button>
                <button type="button" class="txn-pill-btn" data-filter="Cash" onclick="setTxnMethodFilter('Cash', this)">💵 Cash</button>
                <button type="button" class="txn-pill-btn" data-filter="GCash" onclick="setTxnMethodFilter('GCash', this)">📱 GCash</button>
                <button type="button" class="txn-pill-btn" data-filter="Bank Transfer" onclick="setTxnMethodFilter('Bank Transfer', this)">🏦 Bank</button>
                <button type="button" class="txn-pill-btn" data-filter="Warranty Claim" onclick="setTxnMethodFilter('Warranty Claim', this)">🛡️ Warranty</button>
            </div>
        </div>

        <!-- Ledger Table Card -->
        <div class="txn-table-card">
            <div class="table-container table-scroll">
                <table class="data-table" id="txnTable">
                    <thead>
                        <tr>
                            <th>Receipt / ID</th>
                            <th>Date & Time</th>
                            <th>Customer & Unit</th>
                            <th>Lead Tech</th>
                            <th>Payment Channel</th>
                            <th class="num-start">Tendered / Sukli</th>
                            <th class="num-start">Net Amount</th>
                            <th style="text-align: right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="txnTableBody">
                        ${renderTxnRowsHtml(allTxns)}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    ctx.content.innerHTML = html;
}

function buildTransactionLedgerData(releasedJobs, counterSales) {
    const list = [];

    // Service Job Releases
    (releasedJobs || []).forEach(job => {
        const bill = billView(job);
        const payment = job.specs?.payment || {};
        const method = job.payment_method || payment.method || (job.is_warranty_claim ? 'Warranty Claim' : 'Cash');
        const amount = Number(bill.due || 0);
        const tendered = Number(job.amount_paid || payment.amountPaid || (method === 'Cash' ? amount : 0));
        const change = Number(job.change_amount || payment.change || 0);
        const refNo = job.payment_reference || payment.referenceNo || '';
        const notes = job.payment_notes || payment.notes || '';
        const cashier = job.released_by || payment.releasedBy || 'Staff';
        const dateStr = job.date_released || job.released_at || job.date_in;
        const timeStr = job.paid_at ? new Date(job.paid_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (job.time_in || '');

        list.push({
            id: String(job.id),
            type: 'service',
            receiptNo: bill.receiptNo || receiptNumber(job),
            date: dateStr,
            time: timeStr,
            customer: displayName(job.customer),
            moto: job.moto_model || '',
            plate: job.plate_number || '',
            mechanic: job.mechanic_name || '—',
            method: method,
            refNo: refNo,
            notes: notes,
            amount: amount,
            tendered: tendered,
            change: change,
            isWarranty: !!job.is_warranty_claim || bill.covered,
            cashier: cashier,
            rawJob: job,
        });
    });

    // Walk-in counter sales
    (counterSales || []).forEach(cs => {
        list.push({
            id: `cs-${cs.id}`,
            type: 'counter',
            receiptNo: `CS-${String(cs.id).padStart(4, '0')}`,
            date: cs.date,
            time: 'Counter',
            customer: 'Walk-in Retail',
            moto: cs.description || 'Parts Sale',
            plate: 'OTC',
            mechanic: 'Counter',
            method: 'Cash',
            refNo: '',
            notes: 'Over-the-counter sale',
            amount: Number(cs.amount || 0),
            tendered: Number(cs.amount || 0),
            change: 0,
            isWarranty: false,
            cashier: 'Admin',
            rawJob: null,
        });
    });

    // Sort newest first
    list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0) || Number(b.id) - Number(a.id));
    return list;
}

function renderTxnRowsHtml(transactions) {
    if (!transactions || transactions.length === 0) {
        return `<tr><td colspan="8" class="table-empty">No transaction records found.</td></tr>`;
    }

    return transactions.map(tx => {
        let methodClass = 'is-cash';
        let methodIcon = '💵';
        if (tx.method === 'GCash') {
            methodClass = 'is-gcash';
            methodIcon = '📱';
        } else if (tx.method === 'Bank Transfer') {
            methodClass = 'is-bank';
            methodIcon = '🏦';
        } else if (tx.isWarranty || tx.method === 'Warranty Claim') {
            methodClass = 'is-warranty';
            methodIcon = '🛡️';
        }

        const refLine = tx.refNo ? `<span class="txn-ref-code">Ref: ${esc(tx.refNo)}</span>` : '';
        const notesLine = tx.notes ? `<small style="color:var(--text-muted); display:block;">${esc(tx.notes)}</small>` : '';

        let tenderedDisplay = '—';
        if (tx.method === 'Cash' && tx.tendered > 0) {
            tenderedDisplay = `${peso(tx.tendered)}<br><small style="color:var(--text-muted);">Sukli: ${peso(tx.change)}</small>`;
        } else if (tx.method === 'GCash' || tx.method === 'Bank Transfer') {
            tenderedDisplay = `<small style="color:var(--text-muted);">Exact payment</small>`;
        } else if (tx.isWarranty) {
            tenderedDisplay = `<small style="color:#059669; font-weight:700;">Warranty 100%</small>`;
        }

        let amountDisplay = `<span class="txn-amount-val is-positive">+${peso(tx.amount)}</span>`;
        if (tx.isWarranty || tx.amount === 0) {
            amountDisplay = `<span class="txn-amount-val is-covered">₱0.00 <small>(Covered)</small></span>`;
        }

        let actionBtns = '';
        if (tx.type === 'service' && tx.rawJob) {
            actionBtns = `
                <div style="display:flex; justify-content:flex-end; gap:6px;">
                    <button type="button" class="btn btn-ghost btn-sm" onclick="openBillDetail('${esc(tx.id)}')">View</button>
                    <button type="button" class="btn btn-ghost btn-sm" onclick="printReceipt('${esc(tx.id)}')">${icon('printer')}</button>
                </div>
            `;
        } else {
            actionBtns = `<span style="font-size:0.75rem; color:var(--text-muted);">Counter Sale</span>`;
        }

        const searchBlob = `${tx.receiptNo} ${tx.customer} ${tx.plate} ${tx.moto} ${tx.method} ${tx.refNo} ${tx.cashier}`.toLowerCase();

        return `
            <tr data-search="${esc(searchBlob)}" data-method="${esc(tx.method)}">
                <td>
                    <span class="txn-receipt-badge">${esc(tx.receiptNo)}</span>
                </td>
                <td>
                    <strong>${esc(tx.date)}</strong>
                    ${tx.time ? `<br><small style="color:var(--text-muted);">${esc(tx.time)}</small>` : ''}
                </td>
                <td>
                    <strong>${esc(tx.customer)}</strong>
                    <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">
                        ${esc(tx.moto)} ${tx.plate ? `&bull; <code>${esc(tx.plate)}</code>` : ''}
                    </div>
                </td>
                <td>
                    <span style="font-size:0.85rem;">${esc(tx.mechanic)}</span>
                </td>
                <td>
                    <span class="txn-method-badge ${methodClass}">
                        ${methodIcon} ${esc(tx.method)}
                    </span>
                    ${refLine}
                    ${notesLine}
                </td>
                <td class="num-start">
                    ${tenderedDisplay}
                </td>
                <td class="num-start">
                    ${amountDisplay}
                </td>
                <td style="text-align: right;">
                    ${actionBtns}
                </td>
            </tr>
        `;
    }).join('');
}

window.setTxnMethodFilter = function (method, btn) {
    txnActiveMethodFilter = method;
    document.querySelectorAll('.txn-pill-btn').forEach(b => b.classList.remove('is-active'));
    btn?.classList.add('is-active');
    filterTransactionsLedger();
};

window.filterTransactionsLedger = function () {
    const search = (document.getElementById('txnSearchInput')?.value || '').toLowerCase().trim();
    const rows = document.querySelectorAll('#txnTableBody tr[data-search]');

    let visibleCount = 0;
    rows.forEach(row => {
        const text = row.dataset.search || '';
        const method = row.dataset.method || '';

        const matchesSearch = !search || text.includes(search);
        const matchesMethod = txnActiveMethodFilter === 'all' || method === txnActiveMethodFilter;

        if (matchesSearch && matchesMethod) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    const emptyRow = document.getElementById('txnEmptyRow');
    if (visibleCount === 0 && rows.length > 0) {
        if (!emptyRow) {
            const tr = document.createElement('tr');
            tr.id = 'txnEmptyRow';
            tr.innerHTML = `<td colspan="8" class="table-empty">No transactions matching your search/filter.</td>`;
            document.getElementById('txnTableBody')?.appendChild(tr);
        }
    } else {
        emptyRow?.remove();
    }
};
