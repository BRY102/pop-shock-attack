// ============================================================
// MotoTrack — Kanban Live Auto-Refresh (Polling)
// ============================================================
// Polls /api/jobs + /api/jobs/released every 8 s while the
// admin is on the Workflow page. Silently re-renders the board
// only when data has actually changed.
//
// Staff already see their own changes instantly (moveStage →
// loadView). This module makes the ADMIN side stay in sync
// without any manual reload.
// ============================================================

(function () {
    'use strict';

    const POLL_MS = 8000;   // poll interval (ms)
    let _timer = null;
    let _running = false;
    let _badgeFlashTimer = null;

    // ---- Helpers ---- //

    function isOnKanban() {
        return typeof lastViewType !== 'undefined' && lastViewType === 'kanban';
    }

    function isAdmin() {
        return typeof currentRole !== 'undefined' && currentRole === 'admin';
    }

    function snapshot() {
        // Compact fingerprint of active + released jobs
        return JSON.stringify(
            (dbJobs || []).map(j => `${j.id}:${j.stage}:${j.mechanic_name || ''}:${j.updated_at || ''}`)
                .concat(
                    (dbReleased || []).map(j => `r${j.id}:${j.date_released || ''}`)
                )
        );
    }

    function flashLiveBadge() {
        const badge = document.getElementById('kanbanLiveBadge');
        if (!badge) return;
        badge.classList.remove('is-flash');
        // Force reflow so the animation restarts even if already flashing
        void badge.offsetWidth;
        badge.classList.add('is-flash');
        clearTimeout(_badgeFlashTimer);
        _badgeFlashTimer = setTimeout(() => {
            badge?.classList.remove('is-flash');
        }, 2500);
    }

    // ---- Poll tick ---- //

    async function pollTick() {
        // Self-stop if user navigated away or is staff
        if (!isOnKanban() || !isAdmin()) {
            stopKanbanLive();
            return;
        }

        if (!authToken) return;

        const before = snapshot();

        try {
            await Promise.all([
                fetchJobsFromDatabase(),
                fetchReleasedJobsFromDatabase(),
            ]);
        } catch (_) {
            // Network hiccup — silently retry next tick
            return;
        }

        const after = snapshot();
        if (before === after) return; // nothing changed

        // Still on kanban after the fetch?
        if (!isOnKanban()) return;

        // Re-render the board
        const ctx = {
            title: document.getElementById('pageTitle'),
            desc: document.getElementById('pageDesc'),
            actions: document.getElementById('pageToolbar'),
            content: document.getElementById('mainContentArea'),
        };

        if (typeof renderKanban === 'function') {
            renderKanban(ctx);
        }
    }

    // ---- Public API ---- //

    window.startKanbanLive = function () {
        if (_running) return;
        _running = true;
        _timer = setInterval(pollTick, POLL_MS);
    };

    window.stopKanbanLive = function () {
        _running = false;
        if (_timer) { clearInterval(_timer); _timer = null; }
    };

})();

