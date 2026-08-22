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
    ctx.title.innerText = 'Sales & Financial Reports';
    ctx.desc.innerText = 'Itemized breakdown of all completed and released services.';
    ctx.actions.innerHTML = `
        <input type="date" id="filterStart" class="search-bar" style="width: 150px; min-width: auto;">
        <input type="date" id="filterEnd" class="search-bar" style="width: 150px; min-width: auto;">
        <button class="btn btn-primary" onclick="filterReports()">Filter Data</button>
        <button class="btn" style="background:#1d6f42; color:#fff;" onclick="exportReportCsv()">${icon('download')} Export CSV</button>
        <button class="btn" style="background:#555; color:#fff;" onclick="window.print()">${icon('printer')} Print Report</button>
    `;

    reportPeriod = { start: '', end: '' };
    renderReportTable(dbJobs.filter(j => j.stage === 'Release' && j.specs));
}

window.filterReports = function () {
    const start = document.getElementById('filterStart').value;
    const end = document.getElementById('filterEnd').value;
    if (!start || !end) {
        showNotification('Please select both dates.', 'error');
        return;
    }

    reportPeriod = { start, end };
    const filtered = dbJobs.filter(j => j.stage === 'Release' && j.specs && j.date_in >= start && j.date_in <= end);
    renderReportTable(filtered);
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
    let rowsHtml = `<div class="table-container"><table class="data-table"><thead><tr><th>Date</th><th>Customer</th><th>Motorcycle</th><th>Service Type</th><th>Parts Used</th><th>Parts Cost</th><th>Total Billed</th></tr></thead><tbody>`;

    if (jobsArray.length === 0) {
        rowsHtml += `<tr><td colspan="7" style="text-align:center; padding: 1.5rem; color: #777;">No released services in this period.</td></tr>`;
    }

    jobsArray.forEach(job => {
        totalSales += Number(job.specs.totalBill || 0);
        totalPartsCost += Number(job.specs.partsCost || 0);

        const typeBadge = job.is_warranty_claim
            ? `<span style="color:#92400e; font-weight:700; font-size:0.78rem;">WARRANTY CLAIM</span>`
            : `<span style="color:#15803d; font-weight:700; font-size:0.78rem;">NEW SERVICE</span>`;

        rowsHtml += `<tr>
            <td>${esc(job.date_in)}</td>
            <td><strong>${esc(job.customer)}</strong></td>
            <td>${esc(job.moto_model)} (${esc(job.plate_number)})</td>
            <td>${typeBadge}</td>
            <td style="font-size:0.85rem; color:#666;">Base/Labor ₱${Number(job.specs.enginePrice || 0).toLocaleString()}<br>${esc(partsUsedText(job.specs))}</td>
            <td style="color:#d97706; font-weight:bold;">${peso(job.specs.partsCost || 0)}</td>
            <td style="font-weight:bold; color:#28a745; font-size:1.1rem;">${peso(job.specs.totalBill || 0)}</td>
        </tr>`;
    });

    rowsHtml += `</tbody></table></div>`;

    const periodLabel = reportPeriod.start
        ? `${esc(reportPeriod.start)} to ${esc(reportPeriod.end)}`
        : 'All released services';

    document.getElementById('mainContentArea').innerHTML = `
        <div style="background: #fff; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 5px solid #28a745; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
            <p style="font-size: 1rem; color: #555;">Total Shop Revenue Generated <span style="color:#888;">— ${periodLabel}</span></p>
            <h2 style="color: #28a745; font-size: 2.5rem;">${peso(totalSales)}</h2>
            <p style="font-size: 0.9rem; color: #666; margin-top: 0.35rem;">
                ${jobsArray.length} service${jobsArray.length === 1 ? '' : 's'} released &middot;
                parts cost ${peso(totalPartsCost)}
            </p>
        </div>${rowsHtml}`;
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
