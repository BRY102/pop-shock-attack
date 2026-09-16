// ============================================================
// MotoTrack — Shared billing document
// One layout for the customer portal, Sales detail, printed
// bill, and CSV export.
// Must match config/shop.php identity + bill line keys.
// ============================================================

const BILL_ITEM_LABELS = {
    labor: 'Labor',
    oil: 'Fork oil',
    oilSeal: 'Oil seal',
    dustSeal: 'Dust seal',
    springs: 'Springs',
};

const SHOP_IDENTITY = {
    name: 'Pops Shock Attack',
    tagline: 'Suspension Specialists & Tuning',
    address: 'San Pedro, Laguna',
    receiptPrefix: 'PSA',
};

let dbHistoryCache = [];

function receiptNumber(job) {
    const year = String(job?.date_in || job?.date_released || toISODate()).slice(0, 4) || '0000';
    const id = String(job?.id ?? 0).padStart(4, '0');
    return `${SHOP_IDENTITY.receiptPrefix}-${year}-${id}`;
}

function findJobById(jobId) {
    const pools = [dbJobs, dbReleased, dbHistoryCache];
    if (typeof reportRows !== 'undefined') pools.push(reportRows);
    for (const pool of pools) {
        const hit = (pool || []).find(job => String(job.id) === String(jobId));
        if (hit) return hit;
    }
    return null;
}

function billedJobButtonsHtml(job, buttonClass) {
    if (!job?.specs) return '';
    const id = esc(String(job.id));
    const cls = buttonClass || 'btn btn-ghost btn-sm';
    return `<button type="button" class="${cls}" onclick="openBillDetail('${id}')">View bill</button>
            <button type="button" class="${cls}" onclick="printReceipt('${id}')">${icon('printer')} Print</button>`;
}

function laborClassLabel(enginePrice) {
    const cls = ENGINE_CLASSES.find(row => Number(row.price) === Number(enginePrice));
    return cls ? cls.label : 'Base labor';
}

function billLinesOf(job) {
    const specs = job?.specs;
    if (!specs) return [];
    if (Array.isArray(specs.billLines) && specs.billLines.length > 0) {
        return specs.billLines;
    }
    return [{
        key: 'labor',
        label: 'Base Engine/Labor',
        qty: 1,
        unitPrice: Number(specs.enginePrice || 0),
        amount: Number(specs.enginePrice || 0),
    }];
}

function normalizeBillLine(line, job) {
    const key = line.key || 'item';
    const qty = Number(line.qty ?? 1) || 1;
    const amount = Number(line.amount || 0);
    const unitPrice = line.unitPrice != null
        ? Number(line.unitPrice)
        : (qty ? amount / qty : 0);
    const included = amount === 0 && key === 'oil';
    let spec = String(line.label || '').trim() || '—';
    if (key === 'labor') spec = laborClassLabel(job?.specs?.enginePrice ?? unitPrice);
    return {
        key,
        item: BILL_ITEM_LABELS[key] || line.label || 'Item',
        spec,
        qty,
        unitPrice,
        amount,
        included,
    };
}

function prettyDate(iso) {
    if (!iso || iso === '—' || iso === 'N/A') return '—';
    const day = String(iso).slice(0, 10);
    return formatWarrantyDate(day) || day;
}

function billView(job) {
    const lines = billLinesOf(job).map(line => normalizeBillLine(line, job));
    const covered = !!(job.specs?.billCovered || job.is_warranty_claim);
    const subtotal = Number(job.specs?.billSubtotal ?? lines.reduce((sum, line) => sum + line.amount, 0));
    const due = Number(job.specs?.totalBill ?? (covered ? 0 : subtotal));
    return {
        job,
        receiptNo: receiptNumber(job),
        customer: displayName(job.customer),
        moto: job.moto_model || '—',
        plate: job.plate_number || '—',
        mechanic: job.mechanic_name ? displayName(job.mechanic_name) : 'Unassigned',
        dateIn: job.date_in || '—',
        dateReleased: job.date_released || '—',
        type: job.is_warranty_claim ? 'Warranty Claim' : 'New Service',
        lines,
        subtotal,
        covered,
        due,
        warrantyStatus: job.warranty_status || 'Pending',
        warrantyExpires: job.warranty_expires_at || null,
    };
}

function lineByKey(bill, key) {
    return bill.lines.find(line => line.key === key) || null;
}

function unitPriceLabel(line) {
    if (!line) return '—';
    if (line.included) return 'Included';
    return peso(line.unitPrice);
}

function amountLabel(line) {
    if (!line) return '—';
    if (line.included) return 'Included in labor';
    return peso(line.amount);
}

function warrantyBillNote(job) {
    const bill = billView(job);
    if (bill.covered) {
        return 'Warranty claim — amount due ₱0.';
    }
    if (bill.warrantyExpires) {
        const active = String(bill.warrantyExpires) >= toISODate();
        return active
            ? `Warranty: Active until ${prettyDate(bill.warrantyExpires)}`
            : `Warranty: Expired ${prettyDate(bill.warrantyExpires)}`;
    }
    return `Warranty: ${bill.warrantyStatus}`;
}

function billMetaHtml(job) {
    const bill = billView(job);
    return `
        <dl class="bill-meta">
            <div><dt>Receipt No.</dt><dd>${esc(bill.receiptNo)}</dd></div>
            <div><dt>Customer</dt><dd>${esc(bill.customer)}</dd></div>
            <div><dt>Motorcycle</dt><dd>${esc(bill.moto)}</dd></div>
            <div><dt>Plate / Engine No.</dt><dd>${esc(bill.plate)}</dd></div>
            <div><dt>Mechanic</dt><dd>${esc(bill.mechanic)}</dd></div>
            <div><dt>Date in</dt><dd>${esc(prettyDate(bill.dateIn))}</dd></div>
            <div><dt>Date released</dt><dd>${esc(prettyDate(bill.dateReleased))}</dd></div>
            <div><dt>Service type</dt><dd>${esc(bill.type)}</dd></div>
        </dl>`;
}

function billTableHtml(job) {
    if (!job?.specs) {
        return `<p class="cust-muted">Billing appears after the shop logs tuning specs.</p>`;
    }

    const bill = billView(job);
    const rows = bill.lines.map(line => `<tr>
        <td data-label="Item">${esc(line.item)}</td>
        <td data-label="Spec">${esc(line.spec)}</td>
        <td class="bill-qty" data-label="Qty">${esc(String(line.qty))}</td>
        <td class="bill-num" data-label="Unit price">${esc(unitPriceLabel(line))}</td>
        <td class="bill-num" data-label="Amount">${esc(amountLabel(line))}</td>
    </tr>`).join('');

    const waiver = bill.covered
        ? `<tr class="cust-sum-row"><td colspan="4">Warranty coverage</td><td class="bill-num">−${peso(bill.subtotal)}</td></tr>`
        : '';

    return `
        <div class="cust-sheet-wrap">
            <table class="cust-sheet bill-sheet">
                <thead><tr>
                    <th>Item</th><th>Spec</th><th>Qty</th><th>Unit price</th><th>Amount</th>
                </tr></thead>
                <tbody>${rows || `<tr><td colspan="5">No billed lines.</td></tr>`}</tbody>
                <tfoot>
                    <tr class="cust-sum-row cust-subtotal"><td colspan="4">Subtotal</td><td class="bill-num">${peso(bill.subtotal)}</td></tr>
                    ${waiver}
                    <tr class="cust-sum-row bill-due"><td colspan="4">Amount due</td><td class="bill-num">${peso(bill.due)}</td></tr>
                </tfoot>
            </table>
        </div>`;
}

function officialBillHtml(job) {
    const bill = billView(job);
    return `
        <article class="official-bill">
            <header class="official-bill-head">
                <img src="img/logo-psa.png" alt="" class="official-bill-logo">
                <div>
                    <p class="official-kicker">Service bill</p>
                    <h1>${esc(SHOP_IDENTITY.name)}</h1>
                    <p>${esc(SHOP_IDENTITY.tagline)}</p>
                    <p>${esc(SHOP_IDENTITY.address)}</p>
                </div>
                <div class="official-bill-no">
                    <span>Receipt No.</span>
                    <strong>${esc(bill.receiptNo)}</strong>
                </div>
            </header>
            ${billMetaHtml(job)}
            ${billTableHtml(job)}
            <p class="bill-warranty-note">${esc(warrantyBillNote(job))}</p>
            <p class="bill-keep">Keep this bill as your service and warranty record.</p>
        </article>`;
}

function billedJobsSorted(jobs) {
    return [...(jobs || [])]
        .filter(job => job?.specs)
        .sort((a, b) => {
            const byDate = String(a.date_in || '').localeCompare(String(b.date_in || ''));
            return byDate !== 0 ? byDate : Number(a.id) - Number(b.id);
        });
}

function csvLineItems(job) {
    const bill = billView(job);
    const labor = lineByKey(bill, 'labor');
    const oil = lineByKey(bill, 'oil');
    const oilSeal = lineByKey(bill, 'oilSeal');
    const dustSeal = lineByKey(bill, 'dustSeal');
    const springs = lineByKey(bill, 'springs');
    return {
        receiptNo: bill.receiptNo,
        dateIn: bill.dateIn,
        dateReleased: bill.dateReleased === '—' ? '' : bill.dateReleased,
        customer: job.customer || '',
        moto: bill.moto,
        plate: bill.plate,
        type: bill.type,
        mechanic: job.mechanic_name || '',
        laborSpec: labor ? labor.spec : '',
        laborAmount: labor ? labor.amount : 0,
        oilSpec: oil ? oil.spec : '',
        oilAmount: oil ? (oil.included ? 'Included in labor' : oil.amount) : '',
        oilSealSpec: oilSeal ? oilSeal.spec : '',
        oilSealQty: oilSeal ? oilSeal.qty : '',
        oilSealAmount: oilSeal ? oilSeal.amount : '',
        dustSealSpec: dustSeal ? dustSeal.spec : '',
        dustSealQty: dustSeal ? dustSeal.qty : '',
        dustSealAmount: dustSeal ? dustSeal.amount : '',
        springsSpec: springs ? springs.spec : '',
        springsAmount: springs ? springs.amount : '',
        subtotal: bill.subtotal,
        warrantyCoverage: bill.covered ? bill.subtotal : 0,
        amountDue: bill.due,
    };
}

function clearPrintHosts() {
    const expense = document.getElementById('printExpenseReport');
    const billing = document.getElementById('printBillingReport');
    if (expense) expense.innerHTML = '';
    if (billing) billing.innerHTML = '';
}

function printHtmlDocument(innerHtml) {
    clearPrintHosts();
    const host = document.getElementById('printBillingReport');
    if (!host) {
        showNotification('Print layout is missing.', 'error');
        return;
    }
    host.innerHTML = innerHtml;
    document.body.classList.add('printing-report');
    window.print();
    const restore = () => {
        document.body.classList.remove('printing-report');
        host.innerHTML = '';
    };
    window.addEventListener('afterprint', restore, { once: true });
    setTimeout(restore, 1500);
}

window.openBillDetail = function (jobId) {
    const job = findJobById(jobId);
    if (!job || !job.specs) {
        showNotification('This unit has no completed billing yet.', 'error');
        return;
    }
    const title = document.getElementById('billDetailTitle');
    const body = document.getElementById('billDetailBody');
    if (title) title.textContent = receiptNumber(job);
    if (body) {
        body.innerHTML = `
            ${billMetaHtml(job)}
            ${billTableHtml(job)}
            <p class="bill-warranty-note">${esc(warrantyBillNote(job))}</p>`;
    }
    const printBtn = document.getElementById('billDetailPrint');
    if (printBtn) printBtn.onclick = () => printReceipt(jobId);
    openModal('modal-bill-detail');
};
