// ============================================================
// MotoTrack — Printable customer receipt
// Opens as a stand-alone slip (old recibo look) with the new
// bill lines: qty, unit price, amount due, dates, warranty.
// ============================================================

function paymentSettlementHtml(job, bill) {
    if (!job) return '';
    const payment = job.specs?.payment || {};
    const method = job.payment_method || payment.method || (job.is_warranty_claim ? 'Warranty Claim' : null);
    if (!method && !job.date_released) return '';

    const displayMethod = method || 'Cash';
    const tendered = Number(job.amount_paid || payment.amountPaid || bill.due);
    const change = Number(job.change_amount || payment.change || 0);
    const refNo = job.payment_reference || payment.referenceNo || '';
    const cashier = job.released_by || payment.releasedBy || '';

    let html = `<div class="divider"></div><div class="meta">`;
    html += `<div class="row"><span>Payment Method</span><span>${esc(displayMethod)}</span></div>`;
    if (displayMethod === 'Cash' && tendered > 0) {
        html += `<div class="row"><span>Cash Tendered</span><span>${peso(tendered)}</span></div>`;
        html += `<div class="row"><span>Change (Sukli)</span><span>${peso(change)}</span></div>`;
    } else if (refNo) {
        html += `<div class="row"><span>Reference No.</span><span>${esc(refNo)}</span></div>`;
    }
    if (cashier) {
        html += `<div class="row"><span>Settled By</span><span>${esc(cashier)}</span></div>`;
    }
    html += `</div>`;
    return html;
}

function thermalReceiptDocument(job) {
    const bill = billView(job);
    const rows = bill.lines.map(line => `<tr>
        <td class="item">${esc(line.item)}</td>
        <td class="spec">${esc(line.spec)}</td>
        <td class="qty">${esc(String(line.qty))}</td>
        <td class="num">${esc(line.included ? 'Incl.' : unitPriceLabel(line))}</td>
        <td class="num">${esc(line.included ? 'Incl.' : amountLabel(line))}</td>
    </tr>`).join('');

    const waiver = bill.covered
        ? `<tr class="sum"><td colspan="4">Warranty coverage</td><td class="num">−${peso(bill.subtotal)}</td></tr>`
        : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Receipt ${esc(bill.receiptNo)}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
        @page { margin: 8mm; }
        body {
            font-family: 'Courier Prime', monospace;
            color: #000;
            background: #e5e7eb;
            margin: 0;
            padding: 40px 20px;
            display: flex;
            justify-content: center;
        }
        .receipt {
            background: #fff;
            width: 100%;
            max-width: 560px;
            padding: 32px 28px 36px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            border-top: 5px solid #dc3545;
        }
        .header { text-align: center; margin-bottom: 16px; }
        .header h2 { margin: 0; color: #dc3545; font-size: 22px; letter-spacing: -0.5px; }
        .header p { margin: 3px 0; font-size: 12px; color: #555; }
        .receipt-no { margin-top: 8px; font-weight: 700; font-size: 13px; }
        .divider { border-top: 1px dashed #bbb; margin: 16px 0; }
        .meta { font-size: 12px; }
        .row { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 7px; }
        .row span:first-child { color: #555; }
        .row span:last-child { font-weight: 700; text-align: right; }
        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 12px;
            line-height: 1.45;
        }
        th, td {
            padding: 10px 8px 10px 0;
            text-align: left;
            vertical-align: top;
        }
        th:last-child, td:last-child { padding-right: 0; }
        th {
            border-bottom: 1px dashed #bbb;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            padding-bottom: 8px;
        }
        td { border-bottom: 1px dotted #ddd; }
        .item { width: 22%; white-space: nowrap; }
        .spec { width: 36%; word-break: break-word; padding-right: 12px; }
        .qty { width: 10%; text-align: center; white-space: nowrap; }
        .num { width: 16%; text-align: right; white-space: nowrap; padding-left: 8px; }
        tfoot td { border-bottom: none; padding-top: 12px; }
        tfoot tr + tr td { padding-top: 8px; }
        .sum td { font-weight: 700; }
        .due td { font-size: 14px; color: #dc3545; padding-top: 12px; }
        .footer { text-align: center; margin-top: 22px; font-size: 11px; color: #555; line-height: 1.5; }
        .footer strong { color: #000; }
        @media print {
            body { background: #fff; padding: 0; display: block; }
            .receipt { box-shadow: none; max-width: 100%; padding: 0; }
        }
    </style>
</head>
<body>
    <div class="receipt">
        <div class="header">
            <h2>${esc(SHOP_IDENTITY.name.toUpperCase())}</h2>
            <p>${esc(SHOP_IDENTITY.tagline)}</p>
            <p>${esc(SHOP_IDENTITY.address)}</p>
            <p class="receipt-no">${esc(bill.receiptNo)}</p>
        </div>

        <div class="divider"></div>
        <div class="meta">
            <div class="row"><span>Customer</span><span>${esc(bill.customer)}</span></div>
            <div class="row"><span>Motorcycle</span><span>${esc(bill.moto)}</span></div>
            <div class="row"><span>Plate / Engine No.</span><span>${esc(bill.plate)}</span></div>
            <div class="row"><span>Mechanic</span><span>${esc(bill.mechanic)}</span></div>
            <div class="row"><span>Date in</span><span>${esc(prettyDate(bill.dateIn))}</span></div>
            <div class="row"><span>Date released</span><span>${esc(prettyDate(bill.dateReleased))}</span></div>
            <div class="row"><span>Service type</span><span>${esc(bill.type)}</span></div>
        </div>

        <div class="divider"></div>
        <table>
            <thead>
                <tr>
                    <th class="item">Item</th>
                    <th class="spec">Spec</th>
                    <th class="qty">Qty</th>
                    <th class="num">Unit</th>
                    <th class="num">Amount</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
                <tr class="sum"><td colspan="4">Subtotal</td><td class="num">${peso(bill.subtotal)}</td></tr>
                ${waiver}
                <tr class="due"><td colspan="4">Amount due</td><td class="num">${peso(bill.due)}</td></tr>
            </tfoot>
        </table>

        ${paymentSettlementHtml(job, bill)}

        <div class="footer">
            <p>${esc(warrantyBillNote(job))}</p>
            <p style="margin-top:10px;"><i>This acts as your official warranty claim stub. Please keep it safe.</i></p>
        </div>

    </div>
    <script>
        window.onload = function () { setTimeout(() => window.print(), 400); };
    <\/script>
</body>
</html>`;
}

window.printReceipt = function (jobId) {
    const job = findJobById(jobId);
    if (!job || !job.specs) {
        showNotification('This unit has no completed billing yet.', 'error');
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showNotification('Allow pop-ups to print the receipt.', 'error');
        return;
    }
    printWindow.document.write(thermalReceiptDocument(job));
    printWindow.document.close();
};

window.printBillingReport = function (jobs, extras = {}) {
    const billed = billedJobsSorted(jobs);
    if (billed.length === 0 && !(extras.counterSales || []).length) {
        showNotification('Nothing to print for this period.', 'error');
        return;
    }

    const period = extras.periodLabel || 'All released services';
    const bills = billed.map(job => officialBillHtml(job)).join('');
    let counterBlock = '';
    const counterSales = extras.counterSales || [];
    if (counterSales.length > 0) {
        const total = counterSales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0);
        const rows = counterSales.map(sale => `<tr>
            <td>${esc(prettyDate(sale.date))}</td>
            <td>${esc(sale.desc)}</td>
            <td class="num">${peso(sale.amount)}</td>
        </tr>`).join('');
        counterBlock = `
            <section class="official-bill">
                <h2>Counter sales</h2>
                <table class="cust-sheet bill-sheet">
                    <thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
                    <tbody>${rows}</tbody>
                    <tfoot>
                        <tr class="cust-sum-row bill-due"><td colspan="2">Counter total</td><td class="bill-num">${peso(total)}</td></tr>
                    </tfoot>
                </table>
            </section>`;
    }

    printHtmlDocument(`
        <div class="print-report print-billing-pack">
            <header class="print-pack-head">
                <img src="img/logo-psa.png" alt="" class="official-bill-logo">
                <div>
                    <h1>${esc(SHOP_IDENTITY.name)}</h1>
                    <p>Billing report · ${esc(period)}</p>
                    <p>${billed.length} service bill${billed.length === 1 ? '' : 's'}${counterSales.length ? ` · ${counterSales.length} counter sale${counterSales.length === 1 ? '' : 's'}` : ''}</p>
                </div>
            </header>
            ${bills}
            ${counterBlock}
        </div>`);
};
