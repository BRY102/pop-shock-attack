// ============================================================
// MotoTrack — Customer feedback drawer
// Shop roles open this from the header (next to the bell).
// Reviews are real rated jobs only — no placeholder comments.
// ============================================================

const FEEDBACK_PREVIEW = 8;

let feedbackFilter = 'all';
let feedbackCommentsOnly = false;
let feedbackShowAll = false;

function canSeeShopFeedback() {
    return currentRole === 'admin' || currentRole === 'staff';
}

function feedbackInitials(name) {
    const parts = displayName(name).split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

function feedbackDay(job) {
    const raw = String(job.rated_at || job.date_in || '');
    const day = raw.slice(0, 10);
    return formatWarrantyDate(day) || day;
}

function feedbackSentiment(score) {
    if (score >= 5) return { key: '5', label: 'Very Satisfied', tone: 'pos' };
    if (score >= 4) return { key: '4', label: 'Satisfied', tone: 'pos' };
    if (score >= 3) return { key: '3', label: 'Neutral', tone: 'warn' };
    if (score >= 2) return { key: 'low', label: 'Unsatisfied', tone: 'crit' };
    return { key: 'low', label: 'Very Unsatisfied', tone: 'crit' };
}

function collectFeedbackReviews() {
    return allShopJobs()
        .filter(job => {
            if (job.stage !== 'Release') return false;
            const score = Number(job.rating);
            return score >= 1 && score <= 5;
        })
        .sort((a, b) => {
            const byDate = String(b.rated_at || '').localeCompare(String(a.rated_at || ''));
            return byDate !== 0 ? byDate : Number(b.id) - Number(a.id);
        });
}

function matchesFeedbackFilter(job) {
    const score = Number(job.rating);
    const comment = String(job.rating_comment || '').trim();
    if (feedbackCommentsOnly && !comment) return false;
    if (feedbackFilter === '5') return score === 5;
    if (feedbackFilter === '4') return score === 4;
    if (feedbackFilter === '3') return score === 3;
    if (feedbackFilter === 'low') return score <= 2;
    return true;
}

function renderFeedbackCard(job) {
    const score = Number(job.rating);
    const sentiment = feedbackSentiment(score);
    const customer = displayName(job.customer || 'Customer');
    const mechanic = displayName(job.mechanic_name || 'Unassigned');
    const comment = String(job.rating_comment || '').trim();
    const bike = [job.moto_model, job.plate_number].filter(Boolean).join(' · ');

    return `
        <article class="fb-card">
            <div class="fb-card-top">
                <span class="fb-ava" aria-hidden="true">${esc(feedbackInitials(customer))}</span>
                <div class="fb-card-who">
                    <strong>${esc(customer)}</strong>
                    <div class="fb-stars">${starsDisplay(score)}</div>
                </div>
                <div class="fb-card-meta">
                    <time>${esc(feedbackDay(job))}</time>
                    <span class="fb-pill ${sentiment.tone}">${esc(sentiment.label)}</span>
                </div>
            </div>
            <p class="fb-comment${comment ? '' : ' is-empty'}">${comment ? esc(comment) : 'No comment.'}</p>
            <p class="fb-job">${esc(mechanic)} · ${esc(bike || 'Unit not listed')}</p>
        </article>`;
}

function renderFeedbackDrawer() {
    const inner = document.getElementById('feedbackDrawerInner');
    if (!inner) return;

    const all = collectFeedbackReviews();
    const rated = all.length;
    const avg = rated ? all.reduce((sum, job) => sum + Number(job.rating), 0) / rated : null;
    const satisfied = rated ? all.filter(job => Number(job.rating) >= 4).length : 0;
    const satPct = rated ? Math.round((satisfied / rated) * 100) : null;
    const filtered = all.filter(matchesFeedbackFilter);
    const visible = feedbackShowAll ? filtered : filtered.slice(0, FEEDBACK_PREVIEW);
    const canExpand = !feedbackShowAll && filtered.length > FEEDBACK_PREVIEW;

    const listHtml = rated === 0
        ? `<p class="fb-empty">No ratings yet. Scores show after a customer rates a released job.</p>`
        : (visible.length
            ? visible.map(renderFeedbackCard).join('')
            : `<p class="fb-empty">No reviews match this filter.</p>`);

    inner.innerHTML = `
        <header class="fb-head">
            <h2 id="feedbackTitle">${icon('message-circle')} Customer Feedback</h2>
            <button type="button" class="fb-close" onclick="closeFeedbackDrawer()" aria-label="Close feedback">
                ${icon('x')}
            </button>
        </header>
        <div class="fb-stats">
            <div class="fb-stat">
                <span class="fb-stat-label">Overall Rating</span>
                <strong>${avg == null ? '—' : avg.toFixed(1)}</strong>
                <div class="fb-stars">${avg == null ? '' : starsDisplay(avg)}</div>
                <small>(${rated} review${rated === 1 ? '' : 's'})</small>
            </div>
            <div class="fb-stat">
                <span class="fb-stat-label">Satisfaction Rate</span>
                <strong>${satPct == null ? '—' : satPct + '%'}</strong>
                <span class="fb-sat">
                    ${icon('circle-check')}
                    Satisfied Customers
                </span>
            </div>
        </div>
        <div class="fb-controls">
            <label class="sr-only" for="feedbackFilter">Feedback type</label>
            <select id="feedbackFilter" onchange="setFeedbackFilter(this.value)">
                <option value="all">All Feedback</option>
                <option value="5">Very Satisfied</option>
                <option value="4">Satisfied</option>
                <option value="3">Neutral</option>
                <option value="low">Unsatisfied</option>
            </select>
            <button type="button" class="fb-filter-btn${feedbackCommentsOnly ? ' is-on' : ''}"
                onclick="toggleFeedbackCommentsOnly()" aria-pressed="${feedbackCommentsOnly ? 'true' : 'false'}"
                title="${feedbackCommentsOnly ? 'Showing comments only' : 'Show comments only'}">
                ${icon('filter')}
            </button>
        </div>
        <div class="fb-list">${listHtml}</div>
        ${canExpand ? `
            <div class="fb-foot">
                <button type="button" class="fb-all" onclick="showAllFeedback()">
                    View All Feedback ${icon('chevron-right')}
                </button>
            </div>` : ''}`;

    const select = document.getElementById('feedbackFilter');
    if (select) select.value = feedbackFilter;
}

function setFeedbackOpen(open) {
    const drawer = document.getElementById('feedbackDrawer');
    const backdrop = document.getElementById('feedbackBackdrop');
    const bell = document.getElementById('feedbackBell');
    drawer?.classList.toggle('is-open', open);
    backdrop?.classList.toggle('is-open', open);
    drawer?.setAttribute('aria-hidden', open ? 'false' : 'true');
    bell?.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.getElementById('view-system')?.classList.toggle('feedback-open', open);
}

window.syncFeedbackAccess = function () {
    const wrap = document.getElementById('feedbackWrap');
    const allowed = canSeeShopFeedback();
    wrap?.classList.toggle('hidden', !allowed);
    if (!allowed) closeFeedbackDrawer();
};

window.closeFeedbackDrawer = function () {
    if (!document.getElementById('feedbackDrawer')?.classList.contains('is-open')) {
        setFeedbackOpen(false);
        return;
    }
    feedbackShowAll = false;
    setFeedbackOpen(false);
};

window.setFeedbackFilter = function (value) {
    feedbackFilter = value || 'all';
    feedbackShowAll = false;
    renderFeedbackDrawer();
};

window.toggleFeedbackCommentsOnly = function () {
    feedbackCommentsOnly = !feedbackCommentsOnly;
    feedbackShowAll = false;
    renderFeedbackDrawer();
};

window.showAllFeedback = function () {
    feedbackShowAll = true;
    renderFeedbackDrawer();
};

window.toggleFeedbackDrawer = async function () {
    if (!canSeeShopFeedback()) return;
    const drawer = document.getElementById('feedbackDrawer');
    if (drawer?.classList.contains('is-open')) {
        closeFeedbackDrawer();
        return;
    }

    window.closeNotifPanel?.();
    window.closeProfileMenu?.();
    window.closeQuickMenu?.();
    window.closeSidebar?.();

    renderFeedbackDrawer();
    setFeedbackOpen(true);

    try {
        await Promise.all([fetchJobsFromDatabase(), fetchReleasedJobsFromDatabase()]);
    } catch (error) {
        console.error('Failed to refresh feedback:', error);
    }
    if (document.getElementById('feedbackDrawer')?.classList.contains('is-open')) {
        renderFeedbackDrawer();
    }
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeFeedbackDrawer();
});
