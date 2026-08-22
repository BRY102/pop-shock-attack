// ============================================================
// MotoTrack — Business Overview (admin dashboard)
// Stats computation, the three Chart.js charts, metric tiles,
// and the mechanic/consumption tables.
// ============================================================

// One shared look for every chart: app font, muted ink, dark rounded
// tooltips, and dot-style legends instead of Chart.js's default boxes.
if (window.Chart) {
    Chart.defaults.font.family = "'DM Sans', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#6b7280';
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(17,24,39,0.92)';
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.titleFont = { weight: '700', size: 12 };
    Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.pointStyle = 'circle';
    Chart.defaults.plugins.legend.labels.boxWidth = 8;
    Chart.defaults.plugins.legend.labels.boxHeight = 8;
    Chart.defaults.plugins.legend.labels.padding = 14;
}

// Chart.js keeps drawing on a canvas until the instance is destroyed, and the
// overview re-renders whenever its data changes (e.g. after logging an expense).
// Mounting through here replaces the previous chart instead of stacking on it.
const mountedCharts = {};

function mountChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (mountedCharts[canvasId]) mountedCharts[canvasId].destroy();
    mountedCharts[canvasId] = new Chart(canvas.getContext('2d'), config);
}

// Fixed hue order, validated for adjacent colorblind-safe separation. Each
// slot belongs to one brand (in MOTO_BRANDS order: Honda, Yamaha, Suzuki,
// Kawasaki, Rusi), so a brand keeps its color no matter which brands appear.
// "Others" always gets neutral gray.
const BRAND_CHART_COLORS = ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#4a3aa7'];
const OTHERS_CHART_COLOR = '#6b7280';

// Best-effort brand extraction from the free-text model field (e.g. "Yamaha NMAX" -> "Yamaha").
// There's no dedicated brand column yet, so this assumes the brand is the first word.
function extractBrand(motoModel) {
    const first = (motoModel || '').trim().split(/\s+/)[0];
    if (!first) return 'Unknown';
    // Normalize casing so "honda", "HONDA" and "Honda" count as one brand
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

// The parts a job consumed. Jobs logged since the consumables tracker landed
// carry an exact list; older ones are derived from their spec strings
// ("Oil Seal 41x54x11 (2 - Both)" -> 2 of that seal) so their usage and cost
// still count toward the totals.
function consumablesOf(specs) {
    if (Array.isArray(specs.consumables) && specs.consumables.length > 0) {
        return specs.consumables.map(line => ({ name: line.name, qty: Number(line.qty) || 0 }));
    }

    const lines = [];
    [specs.oil, specs.oilSeal, specs.dustSeal, specs.springs].forEach(raw => {
        if (!raw || raw === 'None') return;
        const qtyMatch = raw.match(/\((\d+)/);
        lines.push({ name: raw.split(' (')[0], qty: qtyMatch ? parseInt(qtyMatch[1]) : 1 });
    });

    return lines;
}

// Catalog price per consumable name, for costing the parts a job used.
function buildPriceIndex() {
    const index = {};
    dbInv.forEach(item => { index[item.name] = Number(item.price) || 0; });
    return index;
}

function computeOverviewStats() {
    const todayStr = toISODate();
    const currentMonthStr = todayStr.substring(0, 7);
    const currentYearStr = todayStr.substring(0, 4);

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekStr = toISODate(lastWeek);

    const stats = {
        totalSales: 0, dailySales: 0, weeklySales: 0, monthlySales: 0, yearlySales: 0,
        totalExpenses: 0,
        salesByDate: {}, expByDate: {}, revenueByMonth: {},
        mechanicStats: {}, brandStats: {},
        totalReleased: 0, totalBackjobs: 0, backjobRate: 0,
        lowStockItems: [],
        totalPartsCost: 0, monthlyPartsCost: 0, yearlyPartsCost: 0,
        consumableUsage: {}, stageCounts: {},
    };

    // How many units sit at each step of the workflow right now.
    STAGES.forEach(stage => { stats.stageCounts[stage] = 0; });
    dbJobs.forEach(job => {
        if (stats.stageCounts[job.stage] !== undefined) stats.stageCounts[job.stage] += 1;
    });

    // Parts are costed at current catalog prices so the cost tiles and the
    // consumables table below can never disagree. The per-job snapshot the
    // server stores (specs.partsCost) is what the receipt bills against.
    const priceIndex = buildPriceIndex();

    // Consumables at or below their alert level, most urgent first, so the
    // owner sees what to restock before a job is held up waiting for it.
    stats.lowStockItems = dbInv
        .filter(item => item.is_low_stock)
        .sort((a, b) => (Number(a.stock) - Number(a.threshold)) - (Number(b.stock) - Number(b.threshold)));

    // Brand distribution counts every unit in the shop (any stage), so a new
    // intake shows on the chart immediately. Brands outside MOTO_BRANDS are
    // grouped under "Others", matching the intake form's dropdown. Billing
    // stats below still count released (completed) jobs only.
    dbJobs.forEach(job => {
        const brand = extractBrand(job.moto_model);
        const key = MOTO_BRANDS.includes(brand) ? brand : 'Others';
        stats.brandStats[key] = (stats.brandStats[key] || 0) + 1;
    });

    dbJobs.filter(j => j.stage === 'Release').forEach(job => {
        stats.totalReleased += 1;
        if (job.is_warranty_claim) stats.totalBackjobs += 1;

        if (job.specs && job.specs.totalBill !== undefined) {
            const bill = Number(job.specs.totalBill);
            stats.totalSales += bill;
            if (job.date_in === todayStr) stats.dailySales += bill;
            if (job.date_in >= lastWeekStr && job.date_in <= todayStr) stats.weeklySales += bill;
            if (job.date_in && job.date_in.startsWith(currentMonthStr)) stats.monthlySales += bill;
            if (job.date_in && job.date_in.startsWith(currentYearStr)) stats.yearlySales += bill;

            stats.salesByDate[job.date_in] = (stats.salesByDate[job.date_in] || 0) + bill;

            if (job.date_in) {
                const monthKey = job.date_in.substring(0, 7);
                stats.revenueByMonth[monthKey] = (stats.revenueByMonth[monthKey] || 0) + bill;
            }

            // Which consumables this job used, and what they cost (Objective 2.3)
            let jobPartsCost = 0;
            consumablesOf(job.specs).forEach(line => {
                const cost = (priceIndex[line.name] || 0) * line.qty;
                jobPartsCost += cost;

                if (!stats.consumableUsage[line.name]) {
                    stats.consumableUsage[line.name] = { qty: 0, cost: 0 };
                }
                stats.consumableUsage[line.name].qty += line.qty;
                stats.consumableUsage[line.name].cost += cost;
            });

            stats.totalPartsCost += jobPartsCost;
            if (job.date_in && job.date_in.startsWith(currentMonthStr)) stats.monthlyPartsCost += jobPartsCost;
            if (job.date_in && job.date_in.startsWith(currentYearStr)) stats.yearlyPartsCost += jobPartsCost;
        }

        if (job.mechanic_name) {
            const mech = job.mechanic_name;
            if (!stats.mechanicStats[mech]) stats.mechanicStats[mech] = { total: 0, backjobs: 0 };
            stats.mechanicStats[mech].total += 1;
            if (job.is_warranty_claim) stats.mechanicStats[mech].backjobs += 1;
        }
    });

    stats.backjobRate = stats.totalReleased > 0 ? (stats.totalBackjobs / stats.totalReleased) * 100 : 0;

    dbExpenses.forEach(exp => {
        stats.totalExpenses += exp.amount;
        stats.expByDate[exp.date] = (stats.expByDate[exp.date] || 0) + exp.amount;
    });

    return stats;
}

function buildMechanicTable(mechanicStats) {
    let html = `
        <div style="flex: 1; min-width: 300px;">
            <h3 style="margin-top: 1rem; margin-bottom: 1rem; color: var(--text-primary); font-size: 1.15rem;">Mechanic Performance</h3>
            <div class="table-container"><table class="data-table">
            <thead><tr><th>Mechanic Name</th><th>Completed</th><th>Backjobs</th><th>Rate</th></tr></thead><tbody>
    `;

    const sorted = Object.keys(mechanicStats).sort((a, b) => mechanicStats[b].backjobs - mechanicStats[a].backjobs);

    if (sorted.length === 0) {
        html += `<tr><td colspan="4" style="text-align:center; padding: 1.5rem; color: #777;">No data yet.</td></tr>`;
    } else {
        sorted.forEach(mech => {
            const stats = mechanicStats[mech];
            const rate = stats.total > 0 ? ((stats.backjobs / stats.total) * 100).toFixed(1) : 0;
            const alertStyle = rate > 10
                ? 'color: var(--primary); font-weight: bold; background: #fef2f2; padding: 2px 6px; border-radius: 4px;'
                : 'color: #15803d; font-weight: bold;';
            html += `<tr>
                <td style="color: var(--text-primary); font-weight: 700;">${esc(mech)}</td>
                <td>${stats.total}</td>
                <td style="color: ${stats.backjobs > 0 ? 'var(--primary)' : '#15803d'}; font-weight: bold;">${stats.backjobs}</td>
                <td><span style="${alertStyle}">${rate}%</span></td>
            </tr>`;
        });
    }

    return html + `</tbody></table></div></div>`;
}

// Objective 2.3: every consumable the shop has burned through on completed
// jobs, with what it cost, so the owner can see where parts spending goes.
function buildConsumablesTable(consumableUsage, totalPartsCost) {
    let html = `
        <div style="flex: 1; min-width: 300px;">
            <h3 style="margin-top: 1rem; margin-bottom: 1rem; color: var(--text-primary); font-size: 1.15rem;">Consumables Used & Cost</h3>
            <div class="table-container"><table class="data-table">
            <thead><tr><th>Consumable</th><th>Quantity Used</th><th>Cost</th></tr></thead><tbody>
    `;

    const sorted = Object.keys(consumableUsage).sort((a, b) => consumableUsage[b].cost - consumableUsage[a].cost);

    if (sorted.length === 0) {
        html += `<tr><td colspan="3" style="text-align:center; padding: 1.5rem; color: #777;">No parts used yet.</td></tr>`;
    } else {
        sorted.forEach(name => {
            const use = consumableUsage[name];
            html += `<tr>
                <td style="font-weight: 600; color: var(--text-primary);">${esc(name)}</td>
                <td style="color: var(--text-primary); font-weight: bold;">${use.qty} pcs</td>
                <td style="color: #d97706; font-weight: bold;">${peso(use.cost)}</td>
            </tr>`;
        });
        html += `<tr>
            <td style="font-weight: 700; color: var(--text-primary);">Total</td>
            <td></td>
            <td style="color: #d97706; font-weight: bold;">${peso(totalPartsCost)}</td>
        </tr>`;
    }

    return html + `</tbody></table></div></div>`;
}

// A compact strip showing how many units sit at each workflow step right now.
function buildStagePanel(stageCounts) {
    const cells = STAGES.map(stage => `
        <div style="flex: 1; min-width: 110px; text-align: center; padding: 0.85rem 0.5rem; background: #fff; border: 1px solid var(--border, #e5e7eb); border-radius: 10px;">
            <div style="font-family: 'Bebas Neue', sans-serif; font-size: 1.9rem; line-height: 1; color: var(--text-primary);">${stageCounts[stage]}</div>
            <div style="font-size: 0.78rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.03em; margin-top: 4px;">${esc(stage)}</div>
        </div>`).join('');

    return `
        <div class="chart-container" style="margin-top: 1.5rem;">
            <h3 style="margin-bottom: 0.35rem; color: var(--text-primary); font-size: 1.15rem;">Units on the Floor</h3>
            <p style="margin-bottom: 1rem; color: #6b7280; font-size: 0.9rem;">
                How many units are at each step of the workflow right now.
            </p>
            <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">${cells}</div>
        </div>`;
}

// Only rendered when something actually needs restocking — the stat tile above
// already carries the "nothing low" case, so an empty table would just be noise.
function buildRestockPanel(lowStockItems) {
    if (lowStockItems.length === 0) return '';

    let rows = '';
    lowStockItems.forEach(item => {
        const isOut = Number(item.stock) === 0;
        rows += `<tr>
            <td style="font-weight: 700; color: var(--text-primary);">${esc(item.name)}</td>
            <td style="font-weight: bold; color: ${isOut ? '#d9381e' : '#d97706'};">${item.stock} left</td>
            <td style="color: #6b7280;">alerts at ${item.threshold}</td>
            <td><span class="badge-low">${isOut ? 'OUT OF STOCK' : 'LOW STOCK'}</span></td>
        </tr>`;
    });

    return `
        <div class="chart-container" style="margin-top: 1.5rem; border-left: 4px solid #d9381e;">
            <h3 style="margin-bottom: 0.35rem; color: var(--text-primary); font-size: 1.15rem;">Needs Restock</h3>
            <p style="margin-bottom: 1rem; color: #6b7280; font-size: 0.9rem;">
                These consumables are at or below their alert level. Restock them before they hold up a job.
            </p>
            <div class="table-container"><table class="data-table">
                <thead><tr><th>Consumable</th><th>Remaining</th><th>Alert Level</th><th>Status</th></tr></thead>
                <tbody>${rows}</tbody>
            </table></div>
        </div>`;
}

function drawFinancialChart(stats) {
    const allDates = Array.from(new Set([...Object.keys(stats.salesByDate), ...Object.keys(stats.expByDate)])).sort();
    const salesData = allDates.map(date => stats.salesByDate[date] || 0);
    const expData = allDates.map(date => stats.expByDate[date] || 0);

    mountChart('financialChart', {
        type: 'bar',
        data: {
            labels: allDates.map(dayLabel),
            datasets: [
                { label: 'Gross Sales', data: salesData, backgroundColor: '#28a745', borderRadius: 4, maxBarThickness: 56 },
                { label: 'Expenses', data: expData, backgroundColor: '#f59e0b', borderRadius: 4, maxBarThickness: 56 },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: { label: c => ` ${c.dataset.label}: ${peso(c.parsed.y)}` },
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { maxTicksLimit: 6, callback: v => peso(v) },
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    border: { display: false },
                },
                x: {
                    grid: { display: false },
                    border: { display: false },
                },
            },
        },
    });
}

function drawRevenueTrendChart(stats) {
    const months = Object.keys(stats.revenueByMonth).sort();

    mountChart('revenueTrendChart', {
        type: 'line',
        data: {
            labels: months.map(monthLabel),
            datasets: [{
                label: 'Revenue',
                data: months.map(m => stats.revenueByMonth[m]),
                borderColor: '#2a78d6',
                backgroundColor: 'rgba(42,120,214,0.10)',
                borderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#2a78d6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                tension: 0.35,
                fill: true,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: { label: c => ' Revenue: ' + peso(c.parsed.y) },
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grace: '15%',
                    ticks: { maxTicksLimit: 6, callback: v => peso(v) },
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    border: { display: false },
                },
                x: {
                    grid: { display: false },
                    border: { display: false },
                },
            },
        },
    });
}

// Draws the total unit count in the doughnut's open center.
const brandCenterText = {
    id: 'brandCenterText',
    beforeDraw(chart) {
        const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
        const { left, right, top, bottom } = chart.chartArea;
        const x = (left + right) / 2;
        const y = (top + bottom) / 2;
        const c = chart.ctx;

        c.save();
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = "700 30px 'Bebas Neue', sans-serif";
        c.fillStyle = '#1a1c20';
        c.fillText(total, x, y - 9);
        c.font = "600 10px 'DM Sans', sans-serif";
        c.fillStyle = '#898781';
        c.fillText(total === 1 ? 'UNIT' : 'TOTAL UNITS', x, y + 14);
        c.restore();
    },
};

function drawBrandChart(stats) {
    const labels = [];
    const data = [];
    const colors = [];

    // Known brands first, each with its fixed color slot
    MOTO_BRANDS.forEach((brand, i) => {
        if (stats.brandStats[brand]) {
            labels.push(brand);
            data.push(stats.brandStats[brand]);
            colors.push(BRAND_CHART_COLORS[i]);
        }
    });

    // The grouped catch-all always renders last, in gray
    if (stats.brandStats['Others']) {
        labels.push('Others');
        data.push(stats.brandStats['Others']);
        colors.push(OTHERS_CHART_COLOR);
    }

    mountChart('brandChart', {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderColor: '#fff',
                borderWidth: 2,
                hoverOffset: 8,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '64%',
            layout: { padding: 6 },
            plugins: {
                legend: { position: 'right' },
                tooltip: {
                    callbacks: {
                        label(c) {
                            const total = c.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = total ? Math.round((c.parsed / total) * 100) : 0;
                            return ` ${c.label}: ${c.parsed} unit${c.parsed === 1 ? '' : 's'} (${pct}%)`;
                        },
                    },
                },
            },
        },
        plugins: [brandCenterText],
    });
}

// One metric card: soft-tinted icon chip + value + label.
// `tint` must be a 6-digit hex so the chip background can take 10% alpha.
function statTile({ icon: name, tint, value, label, accent, labelColor, valueColor }) {
    return `
        <div class="stat-card"${accent ? ` style="border-bottom: 3px solid ${accent};"` : ''}>
            <div class="stat-icon" style="background:${tint}1A; color:${tint};">${icon(name)}</div>
            <div>
                <h3${valueColor ? ` style="color:${valueColor};"` : ''}>${value}</h3>
                <p${labelColor ? ` style="color:${labelColor};"` : ''}>${label}</p>
            </div>
        </div>`;
}

function renderOverview(ctx) {
    ctx.title.innerText = 'Business Overview';
    ctx.desc.innerText = 'High-level summary of shop operations & financials';
    ctx.actions.innerHTML = `<button class="btn btn-expense" onclick="openModal('modal-add-expense')">${icon('plus')} Add Expense</button>`;

    const stats = computeOverviewStats();
    const netProfit = stats.totalSales - stats.totalExpenses;

    // Same threshold/coloring convention as the mechanic table below,
    // so "backjob rate" reads consistently everywhere it appears.
    const backjobRateColor = stats.backjobRate > 10 ? '#d9381e' : '#15803d';
    const restockColor = stats.lowStockItems.length > 0 ? '#d9381e' : '#15803d';

    ctx.content.innerHTML = `
        <div class="stats-grid">
            ${statTile({ icon: 'calendar', tint: '#64748b', value: peso(stats.dailySales), label: 'Daily Sales' })}
            ${statTile({ icon: 'calendar-days', tint: '#64748b', value: peso(stats.weeklySales), label: 'Weekly Sales' })}
            ${statTile({ icon: 'calendar-range', tint: '#64748b', value: peso(stats.monthlySales), label: 'Monthly Sales' })}
            ${statTile({ icon: 'calendar-clock', tint: '#64748b', value: peso(stats.yearlySales), label: 'Yearly Sales' })}
            ${statTile({ icon: 'banknote', tint: '#28a745', value: peso(stats.totalSales), label: 'Total Revenue', accent: '#28a745', labelColor: '#28a745' })}
            ${statTile({ icon: 'receipt', tint: '#d97706', value: peso(stats.totalExpenses), label: 'Total Expenses', accent: '#d97706', labelColor: '#d97706' })}
            ${statTile({ icon: 'trending-up', tint: '#0ea5e9', value: peso(netProfit), label: 'Net Profit', accent: '#0ea5e9', labelColor: '#0ea5e9' })}
            ${statTile({ icon: 'check', tint: '#0ea5e9', value: stats.totalReleased, label: 'Services Rendered' })}
            ${statTile({ icon: 'inbox', tint: '#d97706', value: peso(stats.monthlyPartsCost), label: 'Parts Cost (Month)' })}
            ${statTile({ icon: 'inbox', tint: '#d97706', value: peso(stats.yearlyPartsCost), label: 'Parts Cost (Year)' })}
            ${statTile({ icon: 'rotate-ccw', tint: backjobRateColor, value: stats.backjobRate.toFixed(1) + '%', label: 'Back-job / Claim Rate', accent: backjobRateColor, valueColor: backjobRateColor })}
            ${statTile({ icon: 'triangle-alert', tint: restockColor, value: stats.lowStockItems.length, label: 'Needs Restock', accent: restockColor, valueColor: restockColor })}
        </div>

        ${buildStagePanel(stats.stageCounts)}
        ${buildRestockPanel(stats.lowStockItems)}

        <div class="chart-container">
            <h3 style="margin-bottom: 1rem; color: var(--text-primary); font-size: 1.15rem;">Financial Overview: Sales vs Expenses</h3>
            <div style="position: relative; height: 300px;"><canvas id="financialChart"></canvas></div>
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 1.5rem; margin-top: 1.5rem;">
            <div class="chart-container" style="flex: 2; min-width: 320px; margin-top: 0;">
                <h3 style="margin-bottom: 1rem; color: var(--text-primary); font-size: 1.15rem;">Revenue Trend (by Month)</h3>
                <div style="position: relative; height: 280px;"><canvas id="revenueTrendChart"></canvas></div>
            </div>
            <div class="chart-container" style="flex: 1; min-width: 280px; margin-top: 0;">
                <h3 style="margin-bottom: 1rem; color: var(--text-primary); font-size: 1.15rem;">Services by Motorcycle Brand</h3>
                <div style="position: relative; height: 280px;"><canvas id="brandChart"></canvas></div>
            </div>
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 1.5rem; margin-top: 1rem;">
            ${buildMechanicTable(stats.mechanicStats)}
            ${buildConsumablesTable(stats.consumableUsage, stats.totalPartsCost)}
        </div>
    `;

    // Wait one tick so the canvases exist in the DOM before Chart.js draws on them
    setTimeout(() => {
        drawFinancialChart(stats);
        drawRevenueTrendChart(stats);
        drawBrandChart(stats);
    }, 50);
}
