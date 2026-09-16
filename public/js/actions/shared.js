// ============================================================
// MotoTrack — Shared action helpers
// Split from actions.js. Behavior unchanged.
// ============================================================

// The API rejects business-rule violations (stage order, insufficient stock,
// warranty eligibility) with an explanatory message. Show that instead of a
// generic failure, so staff know what to do next.
async function serverMessage(response, fallback) {
    const data = await response.json().catch(() => ({}));
    return data.message || fallback;
}

function paintSheetIcons() {
    document.querySelectorAll('.app-sheet-modal [data-icon]').forEach((slot) => {
        if (slot.dataset.filled === '1') return;
        slot.innerHTML = icon(slot.dataset.icon);
        slot.dataset.filled = '1';
    });
}
