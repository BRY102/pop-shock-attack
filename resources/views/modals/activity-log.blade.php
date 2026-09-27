<div class="modal hidden" id="modal-activity-log">
    <div class="modal-content alog-sheet">
        <div class="modal-header">
            <h2 class="alog-title">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                Activity Log
            </h2>
            <button class="modal-close" onclick="closeModal('modal-activity-log')">&times;</button>
        </div>
        <div id="activityLogBody" class="alog-body"></div>
        <div class="modal-actions">
            <button type="button" class="btn btn-muted" onclick="closeModal('modal-activity-log')">Close</button>
        </div>
    </div>
</div>
