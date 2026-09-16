// ============================================================
// MotoTrack — Overview charts
// Split from overview.js. Behavior unchanged.
// ============================================================

function mountChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (mountedCharts[canvasId]) mountedCharts[canvasId].destroy();
    mountedCharts[canvasId] = new Chart(canvas.getContext('2d'), config);
}

function resizeMountedCharts() {
    Object.values(mountedCharts).forEach(chart => {
        if (chart && typeof chart.resize === 'function') chart.resize();
    });
}

function matchMonthlyTrendHeight() {
    const wrap = document.querySelector('.ov-brand-trend');
    const profit = wrap?.querySelector('.ov-d-brandprofit');
    const trend = wrap?.querySelector('.ov-d-recent');
    if (!wrap || !profit || !trend) return;
    trend.style.height = '';
    if (window.matchMedia('(max-width: 1024px)').matches) return;
    const height = Math.round(profit.getBoundingClientRect().height);
    if (height > 0) trend.style.height = `${height}px`;
}

function matchMechanicHeightToStars() {
    const wrap = document.querySelector('.ov-review-mech');
    const stars = wrap?.querySelector('.ov-d-stars');
    const mech = wrap?.querySelector('.mech-panel');
    if (!wrap || !stars || !mech) return;
    mech.style.height = '';
    if (window.matchMedia('(max-width: 1024px)').matches) return;
    const height = Math.round(stars.getBoundingClientRect().height);
    if (height > 0) mech.style.height = `${height}px`;
}

// Sidebar width is animated, so Chart.js must be told to refit for the whole
// transition — otherwise the canvas keeps the wider size and spills out.
window.fitOverviewCharts = function (durationMs = 400) {
    const start = performance.now();
    cancelAnimationFrame(chartFitRaf);
    const tick = now => {
        matchMonthlyTrendHeight();
        matchMechanicHeightToStars();
        resizeMountedCharts();
        if (now - start < durationMs) chartFitRaf = requestAnimationFrame(tick);
    };
    chartFitRaf = requestAnimationFrame(tick);
};

window.addEventListener('resize', () => {
    matchMonthlyTrendHeight();
    matchMechanicHeightToStars();
    resizeMountedCharts();
});

const SALES_BAR = '#22c55e';
const SALES_PILL = '#e8f6ec';
const SALES_INK = '#166534';
const EXPENSE_BAR = '#f59e0b';
const EXPENSE_PILL = '#fef6e8';
const EXPENSE_INK = '#92400e';

function roundRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
}

// Pill labels above each bar. Chart.js has no datalabels plugin vendored here,
// so this draws them after the bars. Hidden when a day is ₱0 or the series is
// too crowded for the labels to stay readable.
const barValuePills = {
    id: 'barValuePills',
    afterDatasetsDraw(chart) {
        const { ctx, data } = chart;
        const crowded = data.labels.length > 12;

        data.datasets.forEach((dataset, datasetIndex) => {
            if (dataset.type === 'line') return;
            const meta = chart.getDatasetMeta(datasetIndex);
            if (meta.hidden) return;

            meta.data.forEach((bar, i) => {
                const value = Number(dataset.data[i]) || 0;
                if (!value || crowded) return;

                const label = peso(value);
                ctx.save();
                ctx.font = "600 10px 'DM Sans', sans-serif";
                const padX = 6;
                const pillH = 16;
                const textW = ctx.measureText(label).width;
                const pillW = textW + padX * 2;
                const x = bar.x - pillW / 2;
                const y = bar.y - pillH - 6;

                ctx.fillStyle = dataset.pillFill || '#f3f4f6';
                roundRectPath(ctx, x, y, pillW, pillH, 8);
                ctx.fill();

                ctx.fillStyle = dataset.pillInk || '#374151';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, bar.x, y + pillH / 2);
                ctx.restore();
            });
        });
    },
};

function drawFinancialChart(stats) {
    const months = monthKeysForRange(overviewFinanceMonths);
    const salesData = monthlySeries(stats.salesByDate, months);
    const expData = monthlySeries(stats.expByDate, months);
    const barRadius = { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 };
    const thick = months.length > 12 ? 18 : 36;

    mountChart('financialChart', {
        type: 'bar',
        data: {
            labels: months.map(monthLabel),
            datasets: [
                {
                    type: 'bar',
                    label: 'Gross Sales',
                    data: salesData,
                    backgroundColor: SALES_BAR,
                    borderRadius: barRadius,
                    borderSkipped: 'bottom',
                    maxBarThickness: thick,
                    categoryPercentage: 0.62,
                    barPercentage: 0.86,
                    pillFill: SALES_PILL,
                    pillInk: SALES_INK,
                    order: 2,
                },
                {
                    type: 'bar',
                    label: 'Expenses',
                    data: expData,
                    backgroundColor: EXPENSE_BAR,
                    borderRadius: barRadius,
                    borderSkipped: 'bottom',
                    maxBarThickness: thick,
                    categoryPercentage: 0.62,
                    barPercentage: 0.86,
                    pillFill: EXPENSE_PILL,
                    pillInk: EXPENSE_INK,
                    order: 2,
                },
                {
                    type: 'line',
                    label: 'Sales trend',
                    data: salesData,
                    borderColor: 'rgba(34, 197, 94, 0.45)',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [6, 5],
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    tension: 0.3,
                    fill: false,
                    order: 1,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            layout: { padding: { top: 22 } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    filter: item => item.dataset.type !== 'line',
                    callbacks: { label: c => ` ${c.dataset.label}: ${peso(c.parsed.y)}` },
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { maxTicksLimit: 5, callback: v => peso(v) },
                    grid: { color: 'rgba(0,0,0,0.06)', drawTicks: false },
                    border: { display: false },
                },
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { font: { size: 11, weight: '500' } },
                },
            },
        },
        plugins: [barValuePills],
    });
}

function drawRevenueTrendChart(stats) {
    const months = monthKeysForRange(overviewTrendMonths);

    mountChart('revenueTrendChart', {
        type: 'line',
        data: {
            labels: months.map(monthLabel),
            datasets: [{
                label: 'Revenue',
                data: months.map(m => Number(stats.revenueByMonth[m] || 0)),
                borderColor: '#2a78d6',
                backgroundColor: 'rgba(42,120,214,0.10)',
                borderWidth: 2,
                pointRadius: months.length > 12 ? 3 : 5,
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
                    grid: { color: 'rgba(0,0,0,0.06)' },
                    border: { display: false },
                },
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { autoSkip: true, maxTicksLimit: months.length > 12 ? 12 : months.length, maxRotation: 0 },
                },
            },
        },
    });
}

function drawVolumeChart(stats) {
    const months = monthKeysForRange(overviewTrendMonths);

    mountChart('volumeChart', {
        type: 'bar',
        data: {
            labels: months.map(monthLabel),
            datasets: [{
                label: 'Units released',
                data: months.map(m => Number(stats.volumeByMonth[m] || 0)),
                backgroundColor: '#2a78d6',
                borderRadius: 4,
                maxBarThickness: months.length > 12 ? 18 : 48,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label(c) {
                            const n = c.parsed.y;
                            return ` ${n} unit${n === 1 ? '' : 's'} released`;
                        },
                    },
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { maxTicksLimit: 6, stepSize: 1, precision: 0 },
                    grid: { color: 'rgba(0,0,0,0.06)' },
                    border: { display: false },
                },
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { autoSkip: true, maxTicksLimit: months.length > 12 ? 12 : months.length, maxRotation: 0 },
                },
            },
        },
    });
}

// Draws the total unit count in the doughnut's open center.
const brandCenterText = {
    id: 'brandCenterText',
    beforeDraw(chart) {
        const series = chart.data.datasets[0]?.data || [];
        const total = series.reduce((a, b) => a + b, 0);
        const { left, right, top, bottom } = chart.chartArea;
        const x = (left + right) / 2;
        const y = (top + bottom) / 2;
        const c = chart.ctx;

        c.save();
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = "700 30px 'DM Sans', sans-serif";
        c.fillStyle = '#111827';
        c.fillText(String(total), x, y - 9);
        c.font = "600 10px 'DM Sans', sans-serif";
        c.fillStyle = '#9ca3af';
        c.fillText('TOTAL UNITS', x, y + 16);
        c.restore();
    },
};

function renderBrandLegend(labels, colors, counts) {
    const el = document.getElementById('brandLegend');
    if (!el) return;

    if (!labels.length) {
        el.innerHTML = `<p class="brand-legend-empty">No units on the floor yet.</p>`;
        return;
    }

    el.innerHTML = labels.map((name, i) => `
        <p>
            <i style="background: ${colors[i]}"></i>
            ${esc(name)}
            <b>${counts[i]} unit${counts[i] === 1 ? '' : 's'}</b>
        </p>
    `).join('');
}

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

    renderBrandLegend(labels, colors, data);

    const layout = document.querySelector('.brand-layout');
    if (layout) layout.classList.toggle('is-empty', !data.length);

    if (!data.length) {
        if (mountedCharts.brandChart) {
            mountedCharts.brandChart.destroy();
            delete mountedCharts.brandChart;
        }
        return;
    }

    mountChart('brandChart', {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderColor: '#fff',
                borderWidth: 4,
                hoverOffset: 4,
                spacing: 2,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            layout: { padding: 2 },
            plugins: {
                legend: { display: false },
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

function drawReviewDistChart(stats) {
    if (!stats.reviewCount) {
        if (mountedCharts.reviewDistChart) {
            mountedCharts.reviewDistChart.destroy();
            delete mountedCharts.reviewDistChart;
        }
        return;
    }

    mountChart('reviewDistChart', {
        type: 'bar',
        data: {
            labels: ['1★', '2★', '3★', '4★', '5★'],
            datasets: [{
                data: stats.reviewDist,
                backgroundColor: ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'],
                borderRadius: 6,
                barPercentage: 0.78,
                categoryPercentage: 0.82,
            }],
        },
        options: {
            maintainAspectRatio: false,
            layout: { padding: 0 },
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { padding: 4 } },
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0, stepSize: 1, padding: 4 },
                    grid: { color: '#f3f4f6' },
                    border: { display: false },
                },
            },
        },
    });
}
