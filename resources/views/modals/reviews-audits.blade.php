<div class="modal hidden" id="modal-financial-review">
    <div class="modal-content modal-wide">
        <div class="modal-header">
            <h2>Monthly Financial Review</h2>
            <button class="modal-close" onclick="closeModal('modal-financial-review')">&times;</button>
        </div>
        <div id="financialReviewBody"></div>
    </div>
</div>

<div class="modal hidden" id="modal-inventory-audit">
    <div class="modal-content modal-wide">
        <div class="modal-header">
            <h2>Inventory Audit</h2>
            <button class="modal-close" onclick="closeModal('modal-inventory-audit')">&times;</button>
        </div>
        <div id="inventoryAuditBody"></div>
    </div>
</div>

<!-- Filled just before window.print(), so reports can be saved as PDF -->
<div id="printExpenseReport" class="print-only"></div>
<div id="printBillingReport" class="print-only"></div>
