// ============================================================
// MotoTrack — Overview shared state
// Split from overview.js. Behavior unchanged.
// ============================================================

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
// var (not let/const) so the other overview-*.js files can share these.
var mountedCharts = {};
var chartFitRaf = 0;
// Fixed hue order, validated for adjacent colorblind-safe separation. Each
// slot belongs to one brand (in MOTO_BRANDS order: Honda, Yamaha, Suzuki,
// Kawasaki, Rusi), so a brand keeps its color no matter which brands appear.
// "Others" always gets neutral gray.
var BRAND_CHART_COLORS = ['#2563eb', '#14b8a6', '#f59e0b', '#22c55e', '#7c3aed'];
var OTHERS_CHART_COLOR = '#6b7280';
var TREND_RANGES = [
    { months: 3, label: '3 Months' },
    { months: 6, label: '6 Months' },
    { months: 12, label: '1 Year' },
    { months: 24, label: '2 Years' },
];
var overviewTrendMonths = 6;
var overviewFinanceMonths = 6;
var lastOverviewStats = null;
