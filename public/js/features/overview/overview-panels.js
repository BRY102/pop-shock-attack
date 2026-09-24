// ============================================================
// MotoTrack — Overview panels and tables
// Split from overview.js. Behavior unchanged.
// ============================================================

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

function trendPill(pct, invert = false) {
    if (pct === null || Number.isNaN(pct)) return '';
    const favorable = invert ? pct <= 0 : pct >= 0;
    const label = `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}% ${pct >= 0 ? '▲' : '▼'}`;
    return `<span class="trend-pill ${favorable ? 'up' : 'down'}">${label}</span>`;
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

function dashMetric({ icon: name, value, label, trend, plain, iconClass, tone, spark, action, footer }) {
    const chip = `stat-icon${iconClass ? ` ${iconClass}` : ''}${tone ? ` tone-${tone}` : ''}`;
    return `
        <div class="dash-metric${plain ? ' is-plain' : ''}${action ? ' has-action' : ''}${footer ? ' has-footer' : ''}">
            <div class="${chip}">${icon(name)}</div>
            <div class="dash-metric-copy">
                <h3>${value}</h3>
                <p>${label}</p>
                ${action || ''}
            </div>
            ${trend || ''}
            ${spark || ''}
            ${footer ? `<div class="dash-metric-footer">${footer}</div>` : ''}
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
