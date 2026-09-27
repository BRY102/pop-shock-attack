<div class="modal hidden" id="modal-logout">
    <div class="modal-content modal-confirm">
        <h3>Confirm Logout</h3>
        <p>Are you sure you want to end your session?</p>
        <div class="modal-actions">
            <button type="button" class="btn btn-muted" onclick="closeModal('modal-logout')">Cancel</button>
            <button type="button" class="btn btn-danger" onclick="executeLogout()">Log out</button>
        </div>
    </div>
</div>

<div class="modal hidden" id="modal-move-stage">
    <div class="modal-content modal-confirm">
        <h3 id="moveStageTitle">Move this job?</h3>
        <p id="moveStageCopy">Move this unit to the next stage?</p>
        <div class="modal-actions">
            <button type="button" class="btn btn-muted" onclick="cancelKanbanMove()">No</button>
            <button type="button" class="btn btn-primary" onclick="confirmKanbanMove()">Yes</button>
        </div>
    </div>
</div>
