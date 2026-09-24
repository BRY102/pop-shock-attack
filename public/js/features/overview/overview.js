// ============================================================
// MotoTrack — Overview render and reviews
// Stats, panels, and charts live in this folder. Loaded after
// those. Behavior unchanged.
// ============================================================

// ------------------------------------------------------------
// Setup & wizards (read-only views built from the caches the
// Overview already loaded — none of these write to the API)
// ------------------------------------------------------------

function reviewRow(label, value, tone = '') {
    const color = tone === 'good' ? '#15803d' : (tone === 'bad' ? '#b91c1c' : 'var(--text-primary)');
    return `<div><dt>${label}</dt><dd style="color:${color};">${value}</dd></div>`;
}

// "This month vs last month" in words, so the pills on the cards above have
// something explaining them.
function changeSentence(current, previous, invert = false) {
    const pct = monthChange(current, previous);
    if (pct === null || Number.isNaN(pct)) return 'No figures to compare with last month yet.';
    if (!previous) return 'First month with figures — nothing to compare against.';

    const direction = pct >= 0 ? 'higher' : 'lower';
    const verdict = (invert ? pct <= 0 : pct >= 0) ? 'Good' : 'Watch this';
    return `${Math.abs(pct).toFixed(0)}% ${direction} than last month. ${verdict}.`;
}

window.openFinancialReview = function () {
    const stats = computeOverviewStats();
    const monthStr = toISODate().substring(0, 7);
    const monthProfit = stats.monthlySales - stats.monthlyExpenses;
    const prevMonthProfit = stats.prevMonthlySales - stats.prevMonthlyExpenses;

    const monthExpenses = dbExpenses
        .filter(exp => exp.date && exp.date.startsWith(monthStr))
        .sort((a, b) => b.date.localeCompare(a.date));

    const expenseRows = monthExpenses.length === 0
        ? `<tr><td colspan="3" style="text-align:center; padding: 1.25rem; color: #777;">No expenses logged this month.</td></tr>`
        : monthExpenses.map(exp => `<tr>
                <td>${esc(exp.date)}</td>
                <td><strong>${esc(exp.category || 'Expense')}</strong> · ${esc(exp.desc)}</td>
                <td style="font-weight:bold; color:#b45309;">${peso(exp.amount)}</td>
            </tr>`).join('');

    document.getElementById('financialReviewBody').innerHTML = `
        <p class="modal-note">${monthLabel(monthStr)} so far, compared with the month before it.</p>

        <dl class="dash-kv" style="margin-bottom: 1.25rem;">
            ${reviewRow('Sales this month', peso(stats.monthlySales))}
            ${reviewRow('Expenses this month', peso(stats.monthlyExpenses))}
            ${reviewRow('Profit this month', peso(monthProfit), monthProfit >= 0 ? 'good' : 'bad')}
            ${reviewRow('Sales last month', peso(stats.prevMonthlySales))}
            ${reviewRow('Profit last month', peso(prevMonthProfit), prevMonthProfit >= 0 ? 'good' : 'bad')}
            ${reviewRow('Walk-in sales (all time)', peso(stats.counterSalesTotal))}
        </dl>

        <p style="margin-bottom: 0.4rem; font-weight:700; font-size:0.9rem;">Sales</p>
        <p style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.88rem;">${changeSentence(stats.monthlySales, stats.prevMonthlySales)}</p>

        <p style="margin-bottom: 0.4rem; font-weight:700; font-size:0.9rem;">Expenses</p>
        <p style="margin-bottom: 1.25rem; color: var(--text-secondary); font-size: 0.88rem;">${changeSentence(stats.monthlyExpenses, stats.prevMonthlyExpenses, true)}</p>

        <p class="dash-heading">Expenses this month</p>
        <div class="table-container table-compact"><table class="data-table">
            <thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
            <tbody>${expenseRows}</tbody>
        </table></div>

        <div class="modal-actions" style="margin-top: 1.5rem;">
            <button type="button" class="btn btn-muted" onclick="closeModal('modal-financial-review')">Close</button>
            <button type="button" class="btn btn-primary" onclick="closeModal('modal-financial-review'); printExpenseReport();">
                ${icon('printer')} Print Expenses
            </button>
        </div>`;

    openModal('modal-financial-review');
};

// No PDF library here — the browser's print dialog is what saves the PDF.
window.printExpenseReport = function () {
    if (dbExpenses.length === 0) {
        showNotification('No expenses to report yet.', 'error');
        return;
    }

    const sorted = dbExpenses.slice().sort((a, b) => b.date.localeCompare(a.date));
    const total = sorted.reduce((sum, exp) => sum + exp.amount, 0);

    const rows = sorted.map(exp => `<tr>
        <td>${esc(exp.date)}</td>
        <td>${esc(exp.category || '')}</td>
        <td>${esc(exp.desc)}</td>
        <td>${peso(exp.amount)}</td>
    </tr>`).join('');

    clearPrintHosts();
    document.getElementById('printExpenseReport').innerHTML = `
        <div class="print-report">
            <h1>MotoTrack Expense Report</h1>
            <p class="print-meta">Pops Shock Attack &middot; generated ${esc(toISODate())} &middot; ${sorted.length} entr${sorted.length === 1 ? 'y' : 'ies'}</p>
            <table class="data-table">
                <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <p class="print-total">Total expenses: ${peso(total)}</p>
        </div>`;

    document.body.classList.add('printing-report');
    window.print();

    // Restore the app view once the dialog closes (afterprint does not fire
    // in every browser, so the timeout is the fallback).
    const restore = () => document.body.classList.remove('printing-report');
    window.addEventListener('afterprint', restore, { once: true });
    setTimeout(restore, 1500);
};

window.openInventoryAudit = function () {
    const items = dbInv.slice().sort((a, b) => {
        const aGap = Number(a.stock) - Number(a.threshold);
        const bGap = Number(b.stock) - Number(b.threshold);
        return aGap - bGap;
    });

    const rows = items.length === 0
        ? `<tr><td colspan="4" style="text-align:center; padding: 1.5rem; color: #777;">No stock items yet.</td></tr>`
        : items.map(item => {
            const isOut = Number(item.stock) === 0;
            const isLow = Number(item.stock) <= Number(item.threshold);
            const badge = isOut
                ? `<span class="badge-low">OUT OF STOCK</span>`
                : (isLow ? `<span class="badge-low">LOW STOCK</span>` : `<span class="badge-good">GOOD</span>`);

            return `<tr>
                <td><strong>${esc(item.name)}</strong></td>
                <td style="font-weight:bold; color:${isLow ? '#b91c1c' : 'inherit'};">${item.stock} units</td>
                <td style="color:#6b7280;">alerts at ${item.threshold}</td>
                <td>${badge}</td>
            </tr>`;
        }).join('');

    const lowCount = items.filter(item => Number(item.stock) <= Number(item.threshold)).length;

    document.getElementById('inventoryAuditBody').innerHTML = `
        <p class="modal-note">
            ${items.length} stock item${items.length === 1 ? '' : 's'} on record &middot;
            <strong>${lowCount}</strong> at or below alert level. Count the shelf against these numbers
            and correct anything that does not match.
        </p>
        <div class="table-container table-compact"><table class="data-table">
            <thead><tr><th>Consumable</th><th>On Hand</th><th>Alert Level</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody>
        </table></div>
        <div class="modal-actions" style="margin-top: 1.5rem;">
            <button type="button" class="btn btn-muted" onclick="closeModal('modal-inventory-audit')">Close</button>
            <button type="button" class="btn btn-primary" onclick="closeModal('modal-inventory-audit'); loadView('inventory');">
                View inventory
            </button>
        </div>`;

    openModal('modal-inventory-audit');
};

// The header button doubles as a menu: the money entries the owner records
// daily up top, the once-a-month reviews and printouts below them.
function addExpenseButton() {
    return `
        <button type="button" class="btn-add-exp" onclick="openExpenseModal()">
            ${icon('plus')} Add Expense
        </button>
        <button type="button" class="btn-exp-review" onclick="openFinancialReview()">
            ${icon('file-text')} View Report
        </button>`;
}

const SAN_PEDRO = { lat: 14.3644, lon: 121.0543, label: 'San Pedro, Laguna' };
const WEATHER_CACHE_KEY = 'mt_weather_san_pedro';
const WEATHER_TTL_MS = 20 * 60 * 1000;

function manilaNowParts(date = new Date()) {
    const tz = 'Asia/Manila';
    const part = (type, opts) => (
        new Intl.DateTimeFormat('en-US', { timeZone: tz, ...opts })
            .formatToParts(date)
            .find(p => p.type === type)?.value
    );
    return {
        hour: Number(part('hour', { hour: 'numeric', hourCycle: 'h23' })),
        weekday: new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(date),
        dateLine: new Intl.DateTimeFormat('en-US', {
            timeZone: tz, month: 'short', day: 'numeric', year: 'numeric',
        }).format(date),
    };
}

function overviewHello() {
    const hour = manilaNowParts().hour;
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 18) return 'Good Afternoon';
    return 'Good Evening';
}

function weatherIconName(code, isDay) {
    const n = Number(code);
    if (n === 0) return isDay ? 'sun' : 'moon';
    if (n <= 2) return isDay ? 'cloud-sun' : 'cloud';
    if (n === 3 || n === 45 || n === 48) return 'cloud';
    if (n >= 95) return 'cloud-lightning';
    if (n >= 51) return 'cloud-rain';
    return 'cloud';
}

function readWeatherCache() {
    try {
        const raw = sessionStorage.getItem(WEATHER_CACHE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || Date.now() - Number(data.at) > WEATHER_TTL_MS) return null;
        if (typeof data.temp !== 'number') return null;
        return data;
    } catch (e) {
        return null;
    }
}

function writeWeatherCache(data) {
    try {
        sessionStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(data));
    } catch (e) { /* ignore quota */ }
}

function paintOverviewWeather(slot, data) {
    if (!slot || !data) return;
    const ico = weatherIconName(data.code, data.isDay);
    slot.innerHTML = `
        <span class="ov-welcome-ico is-weather">${icon(ico)}</span>
        <div>
            <strong>${Math.round(data.temp)}°C</strong>
            <small>${esc(SAN_PEDRO.label)}</small>
        </div>`;
}

async function loadSanPedroWeather() {
    const cached = readWeatherCache();
    if (cached) return cached;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${SAN_PEDRO.lat}&longitude=${SAN_PEDRO.lon}&current=temperature_2m,weather_code,is_day&timezone=Asia%2FManila`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('weather');
    const json = await response.json();
    const current = json.current || {};
    const data = {
        at: Date.now(),
        temp: Number(current.temperature_2m),
        code: Number(current.weather_code),
        isDay: Number(current.is_day) === 1,
    };
    if (Number.isNaN(data.temp)) throw new Error('weather');
    writeWeatherCache(data);
    return data;
}

function fillOverviewWeather() {
    const slot = document.getElementById('ovWeather');
    if (!slot) return;

    const cached = readWeatherCache();
    if (cached) paintOverviewWeather(slot, cached);

    loadSanPedroWeather()
        .then((data) => {
            if (document.getElementById('ovWeather') !== slot) return;
            paintOverviewWeather(slot, data);
        })
        .catch(() => { });
}

function overviewWelcomeHtml() {
    const when = manilaNowParts();
    const name = displayName(currentUser) || 'Admin';
    return `
        <div class="ov-welcome">
            <span class="ov-welcome-bike">${icon('bike')}</span>
            <div class="ov-welcome-copy">
                <h2>${esc(overviewHello())}, ${esc(name)}!</h2>
                <p>Here's what's happening with your shop today.</p>
            </div>
            <div class="ov-welcome-meta">
                <div class="ov-welcome-date">
                    <span class="ov-welcome-ico">${icon('calendar')}</span>
                    <div>
                        <strong>${esc(when.dateLine)}</strong>
                        <small>${esc(when.weekday)}</small>
                    </div>
                </div>
                <div class="ov-welcome-weather" id="ovWeather">
                    <span class="ov-welcome-ico is-weather">${icon('sun')}</span>
                    <div>
                        <strong>—</strong>
                        <small>${esc(SAN_PEDRO.label)}</small>
                    </div>
                </div>
            </div>
        </div>`;
}

function renderOverview(ctx) {
    ctx.title.innerText = 'Overview';
    ctx.desc.innerText = 'Sales, stock, and jobs today.';
    ctx.actions.innerHTML = '';

    const stats = computeOverviewStats();
    const netProfit = stats.totalSales - stats.totalExpenses;
    const monthProfit = stats.monthlySales - stats.monthlyExpenses;
    const prevMonthProfit = stats.prevMonthlySales - stats.prevMonthlyExpenses;

    const sparkWeeks = lastNWeeksSeries(stats.salesByDate, 12);
    const sparkExpWeeks = lastNWeeksSeries(stats.expByDate, 12);
    const sparkProfitWeeks = sparkWeeks.map((sale, i) => sale - sparkExpWeeks[i]);

    ctx.content.innerHTML = `
        ${overviewWelcomeHtml()}
        <p class="dash-heading">Financial Performance</p>
        <div class="dash-hero">
            ${dashMetric({
        icon: 'philippine-peso',
        tone: 'green',
        value: peso(stats.totalSales),
        label: 'Total Revenue',
        trend: trendPill(monthChange(stats.monthlySales, stats.prevMonthlySales)),
        spark: waveSpark({
            primary: sparkWeeks,
            secondary: sparkExpWeeks,
            tone: 'green',
            label: 'Last 12 weeks: sales vs expenses',
        }),
    })}
            ${dashMetric({
        icon: 'trending-up',
        tone: 'orange',
        value: peso(netProfit),
        label: 'Net Profit',
        trend: trendPill(monthChange(monthProfit, prevMonthProfit)),
        spark: waveSpark({
            primary: sparkProfitWeeks,
            secondary: sparkExpWeeks,
            tone: 'orange',
            label: 'Last 12 weeks: profit vs expenses',
        }),
    })}
            ${dashMetric({
        icon: 'receipt',
        tone: 'red',
        value: peso(stats.totalExpenses),
        label: 'Total Expenses',
        trend: trendPill(monthChange(stats.monthlyExpenses, stats.prevMonthlyExpenses), true),
        spark: waveSpark({
            primary: sparkExpWeeks,
            secondary: sparkWeeks,
            tone: 'red',
            label: 'Last 12 weeks: expenses vs sales',
        }),
        footer: addExpenseButton(),
    })}
        </div>

        <div class="dash-ops">
            <section>
                <p class="dash-heading">Sales Breakdown</p>
                <div class="dash-breakdown">
                    <div class="dash-breakdown-hero">
                        <div class="stat-icon tone-blue">${icon('circle-check')}</div>
                        <div>
                            <h3>${stats.totalReleased}</h3>
                            <p>Services Rendered</p>
                        </div>
                    </div>
                    <dl class="dash-kv">
                        <div><dt>Daily Sales</dt><dd>${peso(stats.dailySales)}</dd></div>
                        <div><dt>Weekly Sales</dt><dd>${peso(stats.weeklySales)}</dd></div>
                        <div><dt>Monthly Sales</dt><dd>${peso(stats.monthlySales)}</dd></div>
                        <div><dt>Yearly Sales</dt><dd>${peso(stats.yearlySales)}</dd></div>
                    </dl>
                    <div class="dash-parts">
                        ${dashMetric({ icon: 'package', tone: 'purple', value: peso(stats.monthlyPartsCost), label: 'Parts Cost (Month)' })}
                        ${dashMetric({ icon: 'layers', tone: 'blue', value: peso(stats.yearlyPartsCost), label: 'Parts Cost (Year)' })}
                    </div>
                </div>
            </section>
            <section>
                <p class="dash-heading">Shop Operations &amp; Alerts</p>
                <div class="dash-alerts">
                    ${dashAlert({ icon: 'rotate-ccw', tone: 'red', value: stats.backjobRate.toFixed(1) + '%', label: 'Back-job / Claim Rate' })}
                    ${dashAlert({ icon: 'triangle-alert', tone: 'orange', value: stats.lowStockItems.length, label: 'Needs Restock' })}
                </div>
            </section>
        </div>

        ${buildStagePanel(stats.stageCounts)}
        ${buildRestockPanel(stats.lowStockItems)}

        <div class="ov-ref">
            <div class="ov-mid">
                <section class="ov-d-panel ov-d-overview">
                    <div class="ov-d-head">
                        <h2>Sales vs expenses</h2>
                        ${financeRangeTabs()}
                    </div>
                    <div class="ov-d-legend">
                        <i class="ov-d-dot red"></i> Gross sales
                        <i class="ov-d-dot gray"></i> Expenses
                    </div>
                    <div class="ov-d-chart" style="position: relative; height: 195px;"><canvas id="financialChart"></canvas></div>
                </section>
                <section class="ov-d-panel ov-d-status">
                    <h2>Jobs by brand</h2>
                    <div class="brand-layout ov-d-donut-wrap">
                        <div class="brand-donut ov-d-donut"><canvas id="brandChart"></canvas></div>
                        <div class="ov-d-status-list" id="brandLegend"></div>
                    </div>
                </section>
            </div>

            <div class="ov-low ov-brand-trend">
                ${buildPartsBrandProfitTable(stats.partsBrandProfit)}
                <section class="ov-d-panel ov-d-recent">
                    <div class="ov-d-head">
                        <h2>Monthly trend</h2>
                        ${trendRangeTabs()}
                    </div>
                    <div class="ov-d-trend">
                        <div>
                            <h3 class="ov-d-sub">Revenue by month</h3>
                            <div class="chart-box"><canvas id="revenueTrendChart"></canvas></div>
                        </div>
                        <div>
                            <h3 class="ov-d-sub">Jobs by month</h3>
                            <div class="chart-box"><canvas id="volumeChart"></canvas></div>
                        </div>
                    </div>
                </section>
            </div>

            ${buildReviewMetrics(stats)}
            ${buildLowerInsightRows(stats)}
        </div>
    `;

    lastOverviewStats = stats;
    fillOverviewWeather();

    // Wait one tick so the canvases exist in the DOM before Chart.js draws on them
    setTimeout(() => {
        matchMonthlyTrendHeight();
        drawFinancialChart(stats);
        drawRevenueTrendChart(stats);
        drawVolumeChart(stats);
        drawBrandChart(stats);
        drawReviewDistChart(stats);
        matchMechanicHeightToStars();
    }, 50);
}
