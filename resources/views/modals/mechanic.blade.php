<div class="modal hidden" id="modal-change-mechanic">
    <div class="modal-content modal-narrow">
        <div class="modal-header">
            <h2>Change mechanic</h2>
            <button type="button" class="modal-close" onclick="closeModal('modal-change-mechanic')">&times;</button>
        </div>
        <p class="modal-lead" id="changeMechCopy">Pick the lead mech for this unit.</p>
        <div class="mech-pick-list" id="changeMechList"></div>
        <div class="modal-actions">
            <button type="button" class="btn btn-muted"
                onclick="closeModal('modal-change-mechanic')">Cancel</button>
        </div>
    </div>
</div>