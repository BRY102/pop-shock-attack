// ============================================================
// MotoTrack — Overview stats
// Split from overview.js. Behavior unchanged.
// ============================================================

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

function monthChange(current, previous) {
    if (!previous && !current) return null;
    if (!previous) return current > 0 ? 100 : null;
    return ((current - previous) / Math.abs(previous)) * 100;
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
