// ============================================================
// MotoTrack — Sales & financial reports (admin)
// Released-job transactions with date filtering, official bill
// printouts, and line-item CSV export.
// ============================================================

// The rows currently on screen, so an export always matches what the
// active date filter is showing rather than the whole history.
let reportRows = [];
let reportPeriod = { start: '', end: '' };

function renderReports(ctx) {
    ctx.title.innerText = 'Sales';
    ctx.desc.innerText = 'Released jobs and totals.';
    ctx.actions.innerHTML = `
        <div class="filter-group">
            <input type="date" id="filterStart" class="date-filter" aria-label="From date">
            <span class="filter-sep"></span>
            <input type="date" id="filterEnd" class="date-filter" aria-label="To date">
        </div>
        <button class="btn btn-primary" onclick="filterReports()">${icon('search')} Filter Data</button>
        <button class="btn btn-ghost" onclick="exportReportCsv()">${icon('download')} Export CSV</button>
        <button class="btn btn-ghost" onclick="printSalesBillingReport()">${icon('printer')} Print Bills</button>
    `;

    reportPeriod = { start: '', end: '' };
    renderReportTable(dbReleased.filter(j => j.specs));
}

window.filterReports = async function () {
    const start = document.getElementById('filterStart').value;
    const end = document.getElementById('filterEnd').value;
    if (!start || !end) {
        showNotification('Please select both dates.', 'error');
        return;
    }

    reportPeriod = { start, end };
    try {
        const response = await apiFetch(`/api/jobs/released?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
        if (!response.ok) {
            showNotification('Could not filter sales.', 'error');
            return;
        }
        const filtered = await response.json();
        renderReportTable(filtered.filter(j => j.specs));
    } catch (error) {
        console.error(error);
        showNotification('Could not filter sales.', 'error');
    }
};

window.printSalesBillingReport = function () {
    const periodLabel = reportPeriod.start
        ? `${reportPeriod.start} to ${reportPeriod.end}`
        : 'All released services';
    printBillingReport(reportRows, {
        periodLabel,
        counterSales: counterSalesInPeriod(),
    });
};

function renderReportTable(jobsArray) {
    reportRows = jobsArray;

    let totalSales = 0;
    let totalPartsCost = 0;
    let rowsHtml = `<div class="table-container table-scroll"><table class="data-table"><thead><tr>
        <th class="cell-keep">Receipt No.</th>
        <th class="cell-keep">Date in</th>
        <th>Released</th>
        <th class="cell-keep">Customer</th>
        <th>Motorcycle</th>
        <th>Type</th>
        <th class="num-start">Amount due</th>
        <th></th>
    </tr></thead><tbody>`;

    if (jobsArray.length === 0) {
        rowsHtml += `<tr><td colspan="8" class="table-empty">No released services in this period.</td></tr>`;
    }

    jobsArray.forEach(job => {
        const bill = billView(job);
        totalSales += bill.due;
        totalPartsCost += Number(job.specs.partsCost || 0);

        const typeBadge = job.is_warranty_claim
            ? `<span class="badge-service claim">Warranty Claim</span>`
            : `<span class="badge-service new">New Service</span>`;

        rowsHtml += `<tr>
            <td class="cell-keep"><span class="cell-title">${esc(bill.receiptNo)}</span></td>
            <td class="cell-keep">${esc(prettyDate(bill.dateIn))}</td>
            <td>${esc(prettyDate(bill.dateReleased))}</td>
            <td class="cell-keep"><span class="cell-title">${esc(bill.customer)}</span></td>
            <td>
                <span class="cell-title">${esc(bill.moto)}</span>
                <span class="cell-sub">${esc(bill.plate)}</span>
            </td>
            <td>${typeBadge}</td>
            <td class="num-start num-strong">${peso(bill.due)}</td>
            <td class="cell-actions">
                <button type="button" class="btn btn-ghost btn-sm" onclick="openBillDetail('${esc(String(job.id))}')">View bill</button>
                <button type="button" class="btn btn-ghost btn-sm" onclick="printReceipt('${esc(String(job.id))}')">${icon('printer')} Print</button>
            </td>
        </tr>`;
    });

    if (jobsArray.length > 0) {
        rowsHtml += `<tr class="is-total">
            <td colspan="6">Total for ${jobsArray.length} service${jobsArray.length === 1 ? '' : 's'}</td>
            <td class="num-start">${peso(totalSales)}</td>
            <td></td>
        </tr>`;
    }

    rowsHtml += `</tbody></table></div>`;

    const periodLabel = reportPeriod.start
        ? `${esc(reportPeriod.start)} to ${esc(reportPeriod.end)}`
        : 'All released services';

    const counterSales = counterSalesInPeriod();
    const counterTotal = counterSales.reduce((sum, sale) => sum + sale.amount, 0);
    const grandSales = totalSales + counterTotal;
    const walkInNote = counterTotal > 0 ? ` &middot; includes ${peso(counterTotal)} walk-in` : '';

    document.getElementById('mainContentArea').innerHTML = `
        <section class="page-section">
            <div class="section-head">
                <p class="dash-heading">Sales Summary</p>
                <span class="section-meta">${periodLabel}${walkInNote}</span>
            </div>
            <div class="dash-hero">
                ${summaryCard('banknote', 'is-money-in', peso(grandSales), 'Total Sales')}
                ${summaryCard('inbox', 'is-money-out', peso(totalPartsCost), 'Parts Cost')}
                ${summaryCard('check', 'is-brand', jobsArray.length, 'Services Released')}
            </div>
        </section>

        <section class="page-section">
            <div class="section-head">
                <p class="dash-heading">Transactions</p>
                <span class="section-meta">${jobsArray.length} released service${jobsArray.length === 1 ? '' : 's'}</span>
            </div>
            ${rowsHtml}
        </section>

        ${counterSalesTable(counterSales, counterTotal)}`;
}

function summaryCard(iconName, tint, value, label) {
    return `
        <div class="dash-metric is-plain">
            <div class="stat-icon ${tint}">${icon(iconName)}</div>
            <div>
                <h3>${value}</h3>
                <p>${label}</p>
            </div>
        </div>`;
}

function counterSalesInPeriod() {
    if (!reportPeriod.start) return dbCounterSales;
    return dbCounterSales.filter(sale => sale.date >= reportPeriod.start && sale.date <= reportPeriod.end);
}

function counterSalesTable(sales, total) {
    if (sales.length === 0) return '';

    const rows = sales
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(sale => `<tr>
            <td>${esc(sale.date)}</td>
            <td><span class="cell-title">${esc(sale.desc)}</span></td>
            <td><span class="badge-service neutral">Counter Sale</span></td>
            <td class="num num-strong">${peso(sale.amount)}</td>
        </tr>`)
        .join('');

    return `
        <section class="page-section">
            <div class="section-head">
                <p class="dash-heading">Counter Sales</p>
                <span class="section-meta">Walk-in income with no service job behind it</span>
            </div>
            <div class="table-container"><table class="data-table">
                <thead><tr><th>Date</th><th>Description</th><th>Type</th><th class="num">Amount</th></tr></thead>
                <tbody>${rows}
                    <tr class="is-total">
                        <td colspan="3">Total for ${sales.length} sale${sales.length === 1 ? '' : 's'}</td>
                        <td class="num">${peso(total)}</td>
                    </tr>
                </tbody>
            </table></div>
        </section>`;
}

function csvCell(value) {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

window.exportReportCsv = function () {
    if (reportRows.length === 0) {
        showNotification('Nothing to export for this period.', 'error');
        return;
    }

    const rows = [[
        'Receipt No.',
        'Date in',
        'Date released',
        'Customer',
        'Motorcycle',
        'Plate / Engine No.',
        'Service Type',
        'Mechanic',
        'Labor spec',
        'Labor amount',
        'Fork oil',
        'Fork oil amount',
        'Oil seal',
        'Oil seal qty',
        'Oil seal amount',
        'Dust seal',
        'Dust seal qty',
        'Dust seal amount',
        'Springs',
        'Springs amount',
        'Subtotal',
        'Warranty coverage',
        'Amount due',
        'Parts cost',
    ]];

    reportRows.forEach(job => {
        const line = csvLineItems(job);
        rows.push([
            line.receiptNo,
            line.dateIn,
            line.dateReleased,
            line.customer,
            line.moto,
            line.plate,
            line.type,
            line.mechanic,
            line.laborSpec,
            line.laborAmount,
            line.oilSpec,
            line.oilAmount,
            line.oilSealSpec,
            line.oilSealQty,
            line.oilSealAmount,
            line.dustSealSpec,
            line.dustSealQty,
            line.dustSealAmount,
            line.springsSpec,
            line.springsAmount,
            line.subtotal,
            line.warrantyCoverage,
            line.amountDue,
            Number(job.specs.partsCost || 0),
        ]);
    });

    const csv = rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const suffix = reportPeriod.start ? `${reportPeriod.start}_to_${reportPeriod.end}` : toISODate();

    const link = document.createElement('a');
    link.href = url;
    link.download = `mototrack_billing_${suffix}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification(`Exported ${reportRows.length} transaction${reportRows.length === 1 ? '' : 's'}.`, 'success');
};
