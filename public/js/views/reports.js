// ============================================================
// MotoTrack — Sales & financial reports (admin)
// Released-job transactions with date filtering, printing, and
// CSV export for record keeping.
// ============================================================

// The rows currently on screen, so an export always matches what the
// active date filter is showing rather than the whole history.
let reportRows = [];
let reportPeriod = { start: '', end: '' };

function renderReports(ctx) {
    ctx.title.innerText = 'Sales';
    ctx.desc.innerText = 'Released jobs and totals.';
    // Filtering is the one primary action here, so it is the only solid button.
    // Export and print are secondary, so they take the neutral ghost style.
    ctx.actions.innerHTML = `
        <div class="filter-group">
            <input type="date" id="filterStart" class="date-filter" aria-label="From date">
            <span class="filter-sep"></span>
            <input type="date" id="filterEnd" class="date-filter" aria-label="To date">
        </div>
        <button class="btn btn-primary" onclick="filterReports()">${icon('search')} Filter Data</button>
        <button class="btn btn-ghost" onclick="exportReportCsv()">${icon('download')} Export CSV</button>
        <button class="btn btn-ghost" onclick="window.print()">${icon('printer')} Print Report</button>
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

// "Daily Oil x1; Oil Seal 41x54x11 x2" — one readable cell for both the
// on-screen table and the exported file.
function partsUsedText(specs) {
    const parts = consumablesOf(specs).map(line => `${line.name} x${line.qty}`);
    return parts.length > 0 ? parts.join('; ') : 'None';
}

function renderReportTable(jobsArray) {
    reportRows = jobsArray;

    let totalSales = 0;
    let totalPartsCost = 0;
    let rowsHtml = `<div class="table-container table-scroll"><table class="data-table"><thead><tr>
        <th class="cell-keep">Date</th><th class="cell-keep">Customer</th><th>Motorcycle</th><th>Service Type</th>
        <th>Parts Used</th><th class="num-start">Parts Cost</th><th class="num-start">Total Billed</th>
    </tr></thead><tbody>`;

    if (jobsArray.length === 0) {
        rowsHtml += `<tr><td colspan="7" class="table-empty">No released services in this period.</td></tr>`;
    }

    jobsArray.forEach(job => {
        totalSales += Number(job.specs.totalBill || 0);
        totalPartsCost += Number(job.specs.partsCost || 0);

        const typeBadge = job.is_warranty_claim
            ? `<span class="badge-service claim">Warranty Claim</span>`
            : `<span class="badge-service new">New Service</span>`;

        rowsHtml += `<tr>
            <td class="cell-keep">${esc(job.date_in)}</td>
            <td class="cell-keep"><span class="cell-title">${esc(displayName(job.customer))}</span></td>
            <td>
                <span class="cell-title">${esc(job.moto_model)}</span>
                <span class="cell-sub">${esc(job.plate_number)}</span>
            </td>
            <td>${typeBadge}</td>
            <td>
                <span class="cell-title">Base / labor ${peso(job.specs.enginePrice || 0)}</span>
                <span class="cell-sub">${esc(partsUsedText(job.specs))}</span>
            </td>
            <td class="num-start num-muted">${peso(job.specs.partsCost || 0)}</td>
            <td class="num-start num-strong">${peso(job.specs.totalBill || 0)}</td>
        </tr>`;
    });

    if (jobsArray.length > 0) {
        rowsHtml += `<tr class="is-total">
            <td colspan="5">Total for ${jobsArray.length} service${jobsArray.length === 1 ? '' : 's'}</td>
            <td class="num-start">${peso(totalPartsCost)}</td>
            <td class="num-start">${peso(totalSales)}</td>
        </tr>`;
    }

    rowsHtml += `</tbody></table></div>`;

    const periodLabel = reportPeriod.start
        ? `${esc(reportPeriod.start)} to ${esc(reportPeriod.end)}`
        : 'All released services';

    // Walk-in income has no job behind it, so it gets its own table below the
    // transactions. Total Sales counts both, matching what Overview reports.
    const counterSales = counterSalesInPeriod();
    const counterTotal = counterSales.reduce((sum, sale) => sum + sale.amount, 0);
    totalSales += counterTotal;

    const walkInNote = counterTotal > 0 ? ` &middot; includes ${peso(counterTotal)} walk-in` : '';

    document.getElementById('mainContentArea').innerHTML = `
        <section class="page-section">
            <div class="section-head">
                <p class="dash-heading">Sales Summary</p>
                <span class="section-meta">${periodLabel}${walkInNote}</span>
            </div>
            <div class="dash-hero">
                ${summaryCard('banknote', 'is-money-in', peso(totalSales), 'Total Sales')}
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

// The three figures at the top of the page. No trend pill here — this page is
// filtered by an arbitrary date range, so a month-on-month delta would lie.
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

// Counter sales inside the active date filter (all of them when unfiltered).
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

// Quote a CSV field only when it needs it, doubling any embedded quotes.
function csvCell(value) {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

window.exportReportCsv = function () {
    if (reportRows.length === 0) {
        showNotification('Nothing to export for this period.', 'error');
        return;
    }

    const rows = [
        ['Date', 'Customer', 'Motorcycle', 'Plate / Engine No.', 'Service Type', 'Base / Labor', 'Parts Used', 'Parts Cost', 'Total Billed'],
    ];

    reportRows.forEach(job => {
        rows.push([
            job.date_in,
            job.customer,
            job.moto_model,
            job.plate_number,
            job.is_warranty_claim ? 'Warranty Claim' : 'New Service',
            Number(job.specs.enginePrice || 0),
            partsUsedText(job.specs),
            Number(job.specs.partsCost || 0),
            Number(job.specs.totalBill || 0),
        ]);
    });

    const csv = rows.map(row => row.map(csvCell).join(',')).join('\r\n');

    // The BOM is what makes Excel read the peso sign and any accented
    // customer name as UTF-8 instead of mojibake.
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const suffix = reportPeriod.start ? `${reportPeriod.start}_to_${reportPeriod.end}` : toISODate();

    const link = document.createElement('a');
    link.href = url;
    link.download = `mototrack_sales_${suffix}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification(`Exported ${reportRows.length} transaction${reportRows.length === 1 ? '' : 's'}.`, 'success');
};
