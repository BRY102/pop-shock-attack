<div class="modal hidden" id="modal-bill-detail">
    <div class="modal-content modal-wide">
        <div class="modal-header">
            <h2 id="billDetailTitle">Service bill</h2>
            <button class="modal-close" onclick="closeModal('modal-bill-detail')">&times;</button>
        </div>
        <div id="billDetailBody" class="bill-detail-body"></div>
        <div class="modal-actions">
            <button type="button" class="btn btn-muted" onclick="closeModal('modal-bill-detail')">Close</button>
            <button type="button" class="btn btn-primary" id="billDetailPrint">Print bill</button>
        </div>
    </div>
</div>
