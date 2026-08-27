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
let chartFitRaf = 0;

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

// Fixed hue order, validated for adjacent colorblind-safe separation. Each
// slot belongs to one brand (in MOTO_BRANDS order: Honda, Yamaha, Suzuki,
// Kawasaki, Rusi), so a brand keeps its color no matter which brands appear.
// "Others" always gets neutral gray.
const BRAND_CHART_COLORS = ['#2563eb', '#14b8a6', '#f59e0b', '#22c55e', '#7c3aed'];
const OTHERS_CHART_COLOR = '#6b7280';

// Best-effort brand extraction from the free-text model field (e.g. "Yamaha NMAX" -> "Yamaha").
// There's no dedicated brand column yet, so this assumes the brand is the first word.
function extractBrand(motoModel) {
    const first = (motoModel || '').trim().split(/\s+/)[0];
    if (!first) return 'Unknown';
    // Normalize casing so "honda", "HONDA" and "Honda" count as one brand
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

// Catalog price per consumable name, for costing the parts a job used.
function buildPriceIndex() {
    const index = {};
    dbInv.forEach(item => { index[item.name] = Number(item.price) || 0; });
    return index;
}

const TREND_RANGES = [
    { months: 3, label: '3 Months' },
    { months: 6, label: '6 Months' },
    { months: 12, label: '1 Year' },
    { months: 24, label: '2 Years' },
];

let overviewTrendMonths = 6;
let overviewFinanceMonths = 6;
let lastOverviewStats = null;

// Inclusive window of calendar months ending this month, so empty months
// still plot as ₱0 / 0 jobs and the owner can see the gap.
function monthKeysForRange(count) {
    const keys = [];
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (count - 1), 1);
    for (let i = 0; i < count; i++) {
        const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
        keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return keys;
}

function rangeTabs(selectedMonths, dataAttr, onclickName, label) {
    return `<div class="trend-range" role="tablist" aria-label="${esc(label)}">
        ${TREND_RANGES.map(range => `
            <button type="button" class="list-tab${range.months === selectedMonths ? ' is-active' : ''}"
                    data-${dataAttr}="${range.months}"
                    onclick="${onclickName}(${range.months})">${range.label}</button>
        `).join('')}
    </div>`;
}

function trendRangeTabs() {
    return rangeTabs(overviewTrendMonths, 'trend-months', 'setOverviewTrend', 'Trend period');
}

function financeRangeTabs() {
    return rangeTabs(overviewFinanceMonths, 'finance-months', 'setOverviewFinance', 'Sales vs expenses period');
}

window.setOverviewTrend = function (months) {
    overviewTrendMonths = Number(months);
    document.querySelectorAll('[data-trend-months]').forEach(btn => {
        btn.classList.toggle('is-active', Number(btn.dataset.trendMonths) === overviewTrendMonths);
    });
    if (!lastOverviewStats) return;
    drawRevenueTrendChart(lastOverviewStats);
    drawVolumeChart(lastOverviewStats);
};

window.setOverviewFinance = function (months) {
    overviewFinanceMonths = Number(months);
    document.querySelectorAll('[data-finance-months]').forEach(btn => {
        btn.classList.toggle('is-active', Number(btn.dataset.financeMonths) === overviewFinanceMonths);
    });
    if (!lastOverviewStats) return;
    drawFinancialChart(lastOverviewStats);
};

function monthlySeries(byDate, months) {
    const totals = Object.fromEntries(months.map(key => [key, 0]));
    Object.entries(byDate || {}).forEach(([date, amount]) => {
        const key = String(date).substring(0, 7);
        if (Object.prototype.hasOwnProperty.call(totals, key)) {
            totals[key] += Number(amount) || 0;
        }
    });
    return months.map(key => totals[key]);
}

function computeOverviewStats() {
    const todayStr = toISODate();
    const currentMonthStr = todayStr.substring(0, 7);
    const currentYearStr = todayStr.substring(0, 4);

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekStr = toISODate(lastWeek);

    const prevMonth = new Date();
    prevMonth.setDate(1);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthStr = toISODate(prevMonth).substring(0, 7);

    const stats = {
        totalSales: 0, dailySales: 0, weeklySales: 0, monthlySales: 0, yearlySales: 0,
        totalExpenses: 0, monthlyExpenses: 0, prevMonthlySales: 0, prevMonthlyExpenses: 0,
        counterSalesTotal: 0,
        salesByDate: {}, expByDate: {}, revenueByMonth: {}, volumeByMonth: {},
        mechanicStats: {}, brandStats: {}, partsBrandProfit: {},
        totalReleased: 0, totalBackjobs: 0, backjobRate: 0,
        lowStockItems: [],
        totalPartsCost: 0, monthlyPartsCost: 0, yearlyPartsCost: 0,
        consumableUsage: {}, stageCounts: {},
        reviewDist: [0, 0, 0, 0, 0],
        reviewSum: 0, reviewCount: 0,
        reviewMonthSum: 0, reviewMonthCount: 0,
        reviewPrevSum: 0, reviewPrevCount: 0,
        reviewRegularSum: 0, reviewRegularCount: 0,
        reviewClaimSum: 0, reviewClaimCount: 0,
    };

    // How many units sit at each step of the workflow right now.
    STAGES.forEach(stage => { stats.stageCounts[stage] = 0; });
    allShopJobs().forEach(job => {
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
    allShopJobs().forEach(job => {
        const brand = extractBrand(job.moto_model);
        const key = MOTO_BRANDS.includes(brand) ? brand : 'Others';
        stats.brandStats[key] = (stats.brandStats[key] || 0) + 1;
    });

    allShopJobs().filter(j => j.stage === 'Release').forEach(job => {
        stats.totalReleased += 1;
        if (job.is_warranty_claim) stats.totalBackjobs += 1;

        if (job.date_in) {
            const monthKey = job.date_in.substring(0, 7);
            stats.volumeByMonth[monthKey] = (stats.volumeByMonth[monthKey] || 0) + 1;
        }

        if (job.specs && job.specs.totalBill !== undefined) {
            const bill = Number(job.specs.totalBill);
            stats.totalSales += bill;
            if (job.date_in === todayStr) stats.dailySales += bill;
            if (job.date_in >= lastWeekStr && job.date_in <= todayStr) stats.weeklySales += bill;
            if (job.date_in && job.date_in.startsWith(currentMonthStr)) stats.monthlySales += bill;
            if (job.date_in && job.date_in.startsWith(currentYearStr)) stats.yearlySales += bill;
            if (job.date_in && job.date_in.startsWith(prevMonthStr)) stats.prevMonthlySales += bill;

            stats.salesByDate[job.date_in] = (stats.salesByDate[job.date_in] || 0) + bill;

            if (job.date_in) {
                const monthKey = job.date_in.substring(0, 7);
                stats.revenueByMonth[monthKey] = (stats.revenueByMonth[monthKey] || 0) + bill;
            }

            // Which consumables this job used, and what they cost (Objective 2.3)
            const suspBrand = (job.suspension_brand || '').trim() || 'Unspecified';
            if (!stats.partsBrandProfit[suspBrand]) {
                stats.partsBrandProfit[suspBrand] = {
                    jobs: 0, billed: 0, cost: 0, profit: 0, claims: 0,
                    parts: {}, types: {}, ratingsSum: 0, ratingsCount: 0,
                };
            }
            const brandRow = stats.partsBrandProfit[suspBrand];

            let jobPartsCost = 0;
            consumablesOf(job.specs).forEach(line => {
                const cost = (priceIndex[line.name] || 0) * line.qty;
                jobPartsCost += cost;

                if (!stats.consumableUsage[line.name]) {
                    stats.consumableUsage[line.name] = { qty: 0, cost: 0 };
                }
                stats.consumableUsage[line.name].qty += line.qty;
                stats.consumableUsage[line.name].cost += cost;
                brandRow.parts[line.name] = (brandRow.parts[line.name] || 0) + line.qty;
            });

            stats.totalPartsCost += jobPartsCost;
            if (job.date_in && job.date_in.startsWith(currentMonthStr)) stats.monthlyPartsCost += jobPartsCost;
            if (job.date_in && job.date_in.startsWith(currentYearStr)) stats.yearlyPartsCost += jobPartsCost;

            const billed = Number(job.specs.totalBill) || 0;
            brandRow.jobs += 1;
            brandRow.billed += billed;
            brandRow.cost += jobPartsCost;
            brandRow.profit += billed - jobPartsCost;
            if (job.is_warranty_claim) brandRow.claims += 1;
            const suspType = (job.suspension_type || '').trim();
            if (suspType) brandRow.types[suspType] = (brandRow.types[suspType] || 0) + 1;
            const brandScore = Number(job.rating);
            if (brandScore >= 1 && brandScore <= 5) {
                brandRow.ratingsSum += brandScore;
                brandRow.ratingsCount += 1;
            }
        }

        if (job.mechanic_name) {
            const mech = job.mechanic_name;
            if (!stats.mechanicStats[mech]) {
                stats.mechanicStats[mech] = { total: 0, backjobs: 0, ratingsSum: 0, ratingsCount: 0 };
            }
            stats.mechanicStats[mech].total += 1;
            if (job.is_warranty_claim) stats.mechanicStats[mech].backjobs += 1;
        }

        const score = Number(job.rating);
        if (score >= 1 && score <= 5) {
            stats.reviewDist[score - 1] += 1;
            stats.reviewSum += score;
            stats.reviewCount += 1;
            const monthKey = String(job.rated_at || job.date_in || '').substring(0, 7);
            if (monthKey === currentMonthStr) {
                stats.reviewMonthSum += score;
                stats.reviewMonthCount += 1;
            } else if (monthKey === prevMonthStr) {
                stats.reviewPrevSum += score;
                stats.reviewPrevCount += 1;
            }
            if (job.is_warranty_claim) {
                stats.reviewClaimSum += score;
                stats.reviewClaimCount += 1;
            } else {
                stats.reviewRegularSum += score;
                stats.reviewRegularCount += 1;
            }
            if (job.mechanic_name && stats.mechanicStats[job.mechanic_name]) {
                stats.mechanicStats[job.mechanic_name].ratingsSum += score;
                stats.mechanicStats[job.mechanic_name].ratingsCount += 1;
            }
        }
    });

    stats.backjobRate = stats.totalReleased > 0 ? (stats.totalBackjobs / stats.totalReleased) * 100 : 0;
    stats.reviewAvg = stats.reviewCount ? stats.reviewSum / stats.reviewCount : null;
    stats.reviewMonthAvg = stats.reviewMonthCount ? stats.reviewMonthSum / stats.reviewMonthCount : null;
    stats.reviewPrevAvg = stats.reviewPrevCount ? stats.reviewPrevSum / stats.reviewPrevCount : null;
    stats.reviewRegularAvg = stats.reviewRegularCount ? stats.reviewRegularSum / stats.reviewRegularCount : null;
    stats.reviewClaimAvg = stats.reviewClaimCount ? stats.reviewClaimSum / stats.reviewClaimCount : null;
    stats.reviewCoverage = stats.totalReleased > 0 ? (stats.reviewCount / stats.totalReleased) * 100 : 0;

    // Walk-in sales are revenue too, so they roll into the sales totals and the
    // charts. "Services rendered" stays a released-job count — no job, no service.
    dbCounterSales.forEach(sale => {
        stats.totalSales += sale.amount;
        stats.counterSalesTotal += sale.amount;
        if (sale.date === todayStr) stats.dailySales += sale.amount;
        if (sale.date >= lastWeekStr && sale.date <= todayStr) stats.weeklySales += sale.amount;
        if (sale.date && sale.date.startsWith(currentMonthStr)) stats.monthlySales += sale.amount;
        if (sale.date && sale.date.startsWith(currentYearStr)) stats.yearlySales += sale.amount;
        if (sale.date && sale.date.startsWith(prevMonthStr)) stats.prevMonthlySales += sale.amount;

        stats.salesByDate[sale.date] = (stats.salesByDate[sale.date] || 0) + sale.amount;
        if (sale.date) {
            const monthKey = sale.date.substring(0, 7);
            stats.revenueByMonth[monthKey] = (stats.revenueByMonth[monthKey] || 0) + sale.amount;
        }
    });

    dbExpenses.forEach(exp => {
        stats.totalExpenses += exp.amount;
        stats.expByDate[exp.date] = (stats.expByDate[exp.date] || 0) + exp.amount;
        if (exp.date && exp.date.startsWith(currentMonthStr)) stats.monthlyExpenses += exp.amount;
        if (exp.date && exp.date.startsWith(prevMonthStr)) stats.prevMonthlyExpenses += exp.amount;
    });

    return stats;
}

function consumableIcon(name) {
    const n = String(name || '').toLowerCase();
    if (n.includes('oil') && !n.includes('seal')) return 'droplet';
    if (n.includes('seal') || n.includes('dust')) return 'cog';
    if (n.includes('spring')) return 'layers';
    return 'package';
}

function consumableKind(name) {
    const n = String(name || '').toLowerCase();
    if (n.includes('oil') && !n.includes('seal')) return 'oil';
    if (n.includes('dust')) return 'dust';
    if (n.includes('seal')) return 'seal';
    if (n.includes('spring')) return 'spring';
    return 'part';
}

function mechanicRatingAvg(row) {
    return row.ratingsCount ? row.ratingsSum / row.ratingsCount : null;
}

function buildMechanicPanel(stats) {
    const mechanicStats = stats.mechanicStats;
    const sorted = Object.keys(mechanicStats).sort((a, b) => {
        const left = mechanicStats[a];
        const right = mechanicStats[b];
        const avgA = mechanicRatingAvg(left);
        const avgB = mechanicRatingAvg(right);
        if (avgA == null && avgB != null) return 1;
        if (avgA != null && avgB == null) return -1;
        if (avgA != null && avgB != null && avgB !== avgA) return avgB - avgA;
        const rateA = left.total ? left.backjobs / left.total : 0;
        const rateB = right.total ? right.backjobs / right.total : 0;
        return rateB - rateA || right.total - left.total || a.localeCompare(b);
    });

    let cards = '';
    if (sorted.length === 0) {
        cards = `<p class="insight-empty">No released jobs yet.</p>`;
    } else {
        cards = sorted.map(mech => {
            const row = mechanicStats[mech];
            const completed = Math.max(0, row.total - row.backjobs);
            const rate = row.total > 0 ? (row.backjobs / row.total) * 100 : 0;
            const isAlert = rate > 10;
            const tone = isAlert ? 'is-alert' : 'is-ok';
            const avg = mechanicRatingAvg(row);
            const ratingLine = avg != null
                ? `${starsDisplay(avg)} <b>${avg.toFixed(1)}</b> · ${row.ratingsCount} review${row.ratingsCount === 1 ? '' : 's'}`
                : '<span class="stars-empty">Not rated</span>';
            const bjLabel = row.backjobs === 1 ? 'back-job' : 'back-jobs';
            return `
                <article class="mech-card">
                    <span class="rev-mech-ava" aria-hidden="true">${esc(reviewInitials(mech))}</span>
                    <div class="mech-card-copy">
                        <h4 class="mech-card-name">${esc(displayName(mech))}</h4>
                        <p class="mech-card-jobs">${completed} completed · ${row.backjobs} ${bjLabel}</p>
                        <p class="mech-card-rate">${ratingLine}</p>
                    </div>
                    <div class="mech-rate">
                        <span class="mech-rate-label">Back-job rate</span>
                        <div class="mech-rate-row">
                            <div class="mech-bar" role="meter" aria-valuemin="0" aria-valuemax="100"
                                 aria-valuenow="${Math.round(rate)}" aria-label="Back-job rate">
                                <span class="${tone}" style="width: ${Math.min(100, rate)}%"></span>
                            </div>
                            <strong class="mech-rate-pct">${rate.toFixed(0)}%</strong>
                            <span class="mech-status ${tone}">${icon(isAlert ? 'flag' : 'check')}</span>
                        </div>
                    </div>
                </article>`;
        }).join('');
    }

    const note = stats.reviewCount
        ? `<p class="ov-d-note">Rating ${formatAvg(stats.reviewRegularAvg)}/5 · Back-jobs ${formatAvg(stats.reviewClaimAvg)}/5</p>`
        : `<p class="ov-d-note">Scores show after a customer rates a released job.</p>`;

    return `
        <section class="ov-d-panel mech-panel">
            <h2>Mechanics</h2>
            ${note}
            <div class="mech-stack">${cards}</div>
        </section>`;
}

// Objective 2.3: every consumable the shop has burned through on completed
// jobs, with what it cost, so the owner can see where parts spending goes.
function buildConsumablesTable(consumableUsage) {
    const sorted = Object.keys(consumableUsage).sort((a, b) => consumableUsage[b].cost - consumableUsage[a].cost);

    if (sorted.length === 0) {
        return `
        <section class="ov-d-panel ov-d-inventory">
            <h2>Parts Usage Breakdown</h2>
            <p class="ov-d-note">Catalog cost of parts used on released jobs.</p>
            <p class="insight-empty">No parts used yet.</p>
        </section>`;
    }

    const totalCost = sorted.reduce((sum, name) => sum + (Number(consumableUsage[name].cost) || 0), 0);
    const totalQty = sorted.reduce((sum, name) => sum + (Number(consumableUsage[name].qty) || 0), 0);
    const topName = sorted[0];

    const rows = sorted.map((name, i) => {
        const use = consumableUsage[name];
        const qty = Number(use.qty) || 0;
        const cost = Number(use.cost) || 0;
        const share = totalCost > 0 ? (cost / totalCost) * 100 : 0;
        const unit = qty > 0 ? cost / qty : null;
        const kind = consumableKind(name);
        const unitLine = unit == null ? '' : `<small>${peso(unit)} / unit</small>`;
        return `
            <div class="pu-row${i === 0 ? ' is-top' : ''}">
                <div class="pu-icon ${kind}">${icon(consumableIcon(name))}</div>
                <div class="pu-name">
                    <b>${esc(name)}</b>
                    ${unitLine}
                </div>
                <div class="pu-qty">
                    <strong>${qty}</strong>
                    <span>used</span>
                </div>
                <div class="pu-cost">${peso(cost)}</div>
                <div class="pu-share">
                    <span>${salesShareLabel(share)}</span>
                    <div class="pu-bar" role="meter" aria-valuemin="0" aria-valuemax="100"
                         aria-valuenow="${Math.round(share)}" aria-label="Share of parts cost">
                        <i style="width:${share}%"></i>
                    </div>
                </div>
            </div>`;
    }).join('');

    return `
        <section class="ov-d-panel ov-d-inventory">
            <h2>Parts Usage Breakdown</h2>
            <p class="ov-d-note">Catalog cost of parts used on released jobs.</p>
            <div class="pu-kpis">
                <div>
                    <span>Total cost</span>
                    <strong>${peso(totalCost)}</strong>
                </div>
                <div>
                    <span>Line items</span>
                    <strong>${sorted.length}</strong>
                </div>
                <div>
                    <span>Units used</span>
                    <strong>${totalQty}</strong>
                </div>
                <div>
                    <span>Highest spend</span>
                    <strong title="${esc(topName)}">${esc(topName)}</strong>
                </div>
            </div>
            <div class="pu-list">
                <div class="pu-cols" aria-hidden="true">
                    <span class="pu-cols-part">Part</span>
                    <span>Qty</span>
                    <span>Cost</span>
                    <span>Share</span>
                </div>
                ${rows}
            </div>
        </section>`;
}

function formatAvg(value) {
    return value == null ? '—' : Number(value).toFixed(1);
}

function reviewInitials(name) {
    return displayName(name)
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase() || '?';
}

function salesShareLabel(pct) {
    if (pct > 0 && pct < 0.5) return '<1%';
    return `${pct.toFixed(0)}%`;
}

function buildPartsBrandProfitTable(partsBrandProfit) {
    const names = Object.keys(partsBrandProfit).sort((a, b) => {
        const left = partsBrandProfit[a];
        const right = partsBrandProfit[b];
        return right.profit - left.profit || right.billed - left.billed || right.jobs - left.jobs;
    });

    if (names.length === 0) {
        return `
        <section class="ov-d-panel ov-d-brandprofit">
            <h2>Parts brand profit</h2>
            <p class="insight-empty">No billed jobs with a suspension brand yet.</p>
        </section>`;
    }

    const totalJobs = names.reduce((sum, name) => sum + partsBrandProfit[name].jobs, 0);
    const rows = names.map(name => {
        const row = partsBrandProfit[name];
        const jobShare = totalJobs > 0 ? (row.jobs / totalJobs) * 100 : 0;
        const tone = row.profit < 0 ? 'is-loss' : 'is-gain';
        const avg = row.ratingsCount ? row.ratingsSum / row.ratingsCount : null;
        const rating = avg == null
            ? `<span class="stars-empty">Not rated</span>`
            : `<span class="bp-rating">${starsDisplay(avg)} <b>${avg.toFixed(1)}</b></span>`;
        return `<tr>
            <td><strong>${esc(name)}</strong></td>
            <td class="num ${tone}">${peso(row.profit)}</td>
            <td class="bp-share-cell">
                <span>${row.jobs}</span>
                <span class="bp-bar"><i style="width:${Math.min(100, jobShare).toFixed(1)}%"></i></span>
            </td>
            <td class="bp-rating-cell">${rating}</td>
        </tr>`;
    }).join('');

    return `
        <section class="ov-d-panel ov-d-brandprofit">
            <h2>Parts brand profit</h2>
            <div class="ov-d-table-wrap">
                <table class="ov-d-table bp-table">
                    <thead>
                        <tr>
                            <th>Brand</th>
                            <th class="num">Profit</th>
                            <th>Jobs</th>
                            <th>Rating</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </section>`;
}

function ovBottomMetric({ tone, iconName, label, value, hint }) {
    return `
        <div class="ov-d-metric">
            <div class="ov-d-metric-icon ${tone}">${icon(iconName)}</div>
            <div>
                <span>${label}</span>
                <strong>${value}</strong>
                ${hint ? `<small>${hint}</small>` : ''}
            </div>
        </div>`;
}

function reviewDelta(stats) {
    const monthDelta = (stats.reviewMonthAvg != null && stats.reviewPrevAvg != null)
        ? stats.reviewMonthAvg - stats.reviewPrevAvg
        : null;
    return {
        label: monthDelta == null ? '—' : `${monthDelta >= 0 ? '+' : ''}${monthDelta.toFixed(1)}`,
        hint: monthDelta == null ? 'No last-month compare yet' : 'vs last month',
    };
}

function buildReviewMetrics(stats) {
    const delta = reviewDelta(stats);
    const rated = stats.totalReleased > 0 ? `${stats.reviewCoverage.toFixed(0)}%` : '—';
    return `
        <div class="ov-d-metrics">
            ${ovBottomMetric({ tone: 'red', iconName: 'star', label: 'Average score', value: formatAvg(stats.reviewAvg) })}
            ${ovBottomMetric({ tone: 'orange', iconName: 'users', label: 'Reviews', value: String(stats.reviewCount) })}
            ${ovBottomMetric({ tone: 'green', iconName: 'clipboard-check', label: 'Jobs rated', value: rated })}
            ${ovBottomMetric({ tone: 'blue', iconName: 'trending-up', label: 'vs last month', value: delta.label, hint: delta.hint })}
        </div>`;
}

function buildStarDistPanel(stats) {
    if (!stats.reviewCount) return '';
    return `
        <section class="ov-d-panel ov-d-stars">
            <h2>Star distribution</h2>
            <p class="ov-d-note">Count of rated visits.</p>
            <div class="rev-chart"><canvas id="reviewDistChart"></canvas></div>
        </section>`;
}

function buildLowerInsightRows(stats) {
    const mechanics = buildMechanicPanel(stats);
    const parts = buildConsumablesTable(stats.consumableUsage);
    if (stats.reviewCount) {
        return `
            <div class="ov-low ov-review-mech">
                ${buildStarDistPanel(stats)}
                ${mechanics}
            </div>
            <div class="ov-low ov-end ov-parts-only">${parts}</div>`;
    }
    return `<div class="ov-low ov-end">${mechanics}${parts}</div>`;
}

// A compact strip showing how many units sit at each workflow step right now.
function buildStagePanel(stageCounts) {
    const cells = STAGES.map((stage, i) => {
        const count = Number(stageCounts[stage]) || 0;
        return `
        <div class="floor-station${count ? ' is-active' : ''}">
            <div>
                <span class="station-num">${stationNumber(i)}</span>
                <b>${count}</b>
                <span class="floor-station-name">${esc(stage)}</span>
            </div>
            <div class="floor-station-icon">${icon(STAGE_LINE_ICONS[stage])}</div>
        </div>`;
    }).join('');

    return `
        <div class="floor-panel">
            <h3>On the floor</h3>
            <p>Jobs at each stage.</p>
            <div class="floor-line">${cells}</div>
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
            <h3 style="margin-bottom: 0.35rem; color: var(--text-primary); font-size: 1.15rem;">Low stock</h3>
            <p style="margin-bottom: 1rem; color: #6b7280; font-size: 0.9rem;">
                At or below alert level.
            </p>
            <div class="table-container"><table class="data-table">
                <thead><tr><th>Consumable</th><th>Remaining</th><th>Alert Level</th><th>Status</th></tr></thead>
                <tbody>${rows}</tbody>
            </table></div>
        </div>`;
}

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

function monthChange(current, previous) {
    if (!previous && !current) return null;
    if (!previous) return current > 0 ? 100 : null;
    return ((current - previous) / Math.abs(previous)) * 100;
}

function trendPill(pct, invert = false) {
    if (pct === null || Number.isNaN(pct)) return '';
    const favorable = invert ? pct <= 0 : pct >= 0;
    const label = `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}% ${pct >= 0 ? '▲' : '▼'}`;
    return `<span class="trend-pill ${favorable ? 'up' : 'down'}">${label}</span>`;
}

function lastNWeeksSeries(byDate, weeks) {
    const totals = Array(weeks).fill(0);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    Object.entries(byDate || {}).forEach(([date, amount]) => {
        const key = String(date).substring(0, 10);
        const d = new Date(`${key}T00:00:00`);
        if (Number.isNaN(d.getTime())) return;
        const diffDays = Math.floor((todayStart - d) / 86400000);
        if (diffDays < 0) return;
        const weekIndex = weeks - 1 - Math.floor(diffDays / 7);
        if (weekIndex >= 0 && weekIndex < weeks) {
            totals[weekIndex] += Number(amount) || 0;
        }
    });
    return totals;
}

function sparkPoints(values, w, h, min, max) {
    const nums = values.map(n => Number(n) || 0);
    const span = max - min || 1;
    const padY = 18;
    const usable = h - padY * 2;
    return nums.map((v, i) => {
        const x = nums.length === 1 ? w / 2 : (i / (nums.length - 1)) * w;
        const y = padY + (1 - (v - min) / span) * usable;
        return [x, y];
    });
}

function fmtSparkPt(point) {
    return `${point[0].toFixed(1)} ${point[1].toFixed(1)}`;
}

function smoothSPath(points) {
    if (points.length < 2) return '';
    if (points.length === 2) {
        return `M${fmtSparkPt(points[0])} L${fmtSparkPt(points[1])}`;
    }
    const t = 0.32;
    const segs = [];
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i - 1] || points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;
        segs.push({
            c1: [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t],
            c2: [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t],
            p: p2,
        });
    }
    let d = `M${fmtSparkPt(points[0])} C${fmtSparkPt(segs[0].c1)} ${fmtSparkPt(segs[0].c2)} ${fmtSparkPt(segs[0].p)}`;
    for (let i = 1; i < segs.length; i++) {
        d += ` S${fmtSparkPt(segs[i].c2)} ${fmtSparkPt(segs[i].p)}`;
    }
    return d;
}

function waveSpark({ primary, secondary, tone, label }) {
    const main = (primary || []).map(n => Number(n) || 0);
    const cmp = (secondary || []).map(n => Number(n) || 0);
    if (main.length < 2) return '';
    const w = 600;
    const h = 190;
    const both = cmp.length === main.length ? main.concat(cmp) : main;
    const min = Math.min(0, ...both);
    const max = Math.max(...both, 0);
    const mainPath = smoothSPath(sparkPoints(main, w, h, min, max));
    const cmpPath = cmp.length === main.length
        ? smoothSPath(sparkPoints(cmp, w, h, min, max))
        : '';
    const area = `${mainPath} L${w} ${h} L0 ${h} Z`;
    return `<div class="dash-spark-plot">
        <svg class="spark ${tone}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
            <title>${esc(label || '')}</title>
            <path class="area" d="${area}"></path>
            ${cmpPath ? `<path class="line gray-line" d="${cmpPath}"></path>` : ''}
            <path class="line red-line" d="${mainPath}"></path>
        </svg>
    </div>`;
}

function dashMetric({ icon: name, value, label, trend, plain, iconClass, tone, spark }) {
    const chip = `stat-icon${iconClass ? ` ${iconClass}` : ''}${tone ? ` tone-${tone}` : ''}`;
    return `
        <div class="dash-metric${plain ? ' is-plain' : ''}">
            <div class="${chip}">${icon(name)}</div>
            <div>
                <h3>${value}</h3>
                <p>${label}</p>
            </div>
            ${trend || ''}
            ${spark || ''}
        </div>`;
}

function dashAlert({ icon: name, value, label, tone }) {
    return `
        <div class="dash-alert">
            <div class="stat-icon${tone ? ` tone-${tone}` : ''}">${icon(name)}</div>
            <div>
                <h3>${value}</h3>
                <p>${label}</p>
            </div>
        </div>`;
}

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
                <td><strong>${esc(exp.desc)}</strong></td>
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
        <td>${esc(exp.desc)}</td>
        <td>${peso(exp.amount)}</td>
    </tr>`).join('');

    document.getElementById('printExpenseReport').innerHTML = `
        <div class="print-report">
            <h1>MotoTrack Expense Report</h1>
            <p class="print-meta">Pops Shock Attack &middot; generated ${esc(toISODate())} &middot; ${sorted.length} entr${sorted.length === 1 ? 'y' : 'ies'}</p>
            <table class="data-table">
                <thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
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
    return `<button type="button" class="btn btn-expense" onclick="openModal('modal-add-expense')">${icon('plus')} Add Expense</button>`;
}

function renderOverview(ctx) {
    ctx.title.innerText = 'Overview';
    ctx.desc.innerText = 'Sales, stock, and jobs today.';
    ctx.actions.innerHTML = addExpenseButton();

    const stats = computeOverviewStats();
    const netProfit = stats.totalSales - stats.totalExpenses;
    const monthProfit = stats.monthlySales - stats.monthlyExpenses;
    const prevMonthProfit = stats.prevMonthlySales - stats.prevMonthlyExpenses;

    const sparkWeeks = lastNWeeksSeries(stats.salesByDate, 12);
    const sparkExpWeeks = lastNWeeksSeries(stats.expByDate, 12);
    const sparkProfitWeeks = sparkWeeks.map((sale, i) => sale - sparkExpWeeks[i]);

    ctx.content.innerHTML = `
        <p class="dash-heading">Financial Performance</p>
        <div class="dash-hero">
            ${dashMetric({
                icon: 'circle-dollar',
                tone: 'red',
                value: peso(stats.totalSales),
                label: 'Total Revenue',
                trend: trendPill(monthChange(stats.monthlySales, stats.prevMonthlySales)),
                spark: waveSpark({
                    primary: sparkWeeks,
                    secondary: sparkExpWeeks,
                    tone: 'red',
                    label: 'Last 12 weeks: sales vs expenses',
                }),
            })}
            ${dashMetric({
                icon: 'trending-up',
                tone: 'green',
                value: peso(netProfit),
                label: 'Net Profit',
                trend: trendPill(monthChange(monthProfit, prevMonthProfit)),
                spark: waveSpark({
                    primary: sparkProfitWeeks,
                    secondary: sparkExpWeeks,
                    tone: 'green',
                    label: 'Last 12 weeks: profit vs expenses',
                }),
            })}
            ${dashMetric({
                icon: 'receipt',
                tone: 'orange',
                value: peso(stats.totalExpenses),
                label: 'Total Expenses',
                trend: trendPill(monthChange(stats.monthlyExpenses, stats.prevMonthlyExpenses), true),
                spark: waveSpark({
                    primary: sparkExpWeeks,
                    secondary: sparkWeeks,
                    tone: 'orange',
                    label: 'Last 12 weeks: expenses vs sales',
                }),
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
