<div class="modal hidden" id="modal-add-sale">
    <div class="modal-content modal-narrow">
        <div class="modal-header">
            <h2>Record Counter Sale</h2>
            <button class="modal-close" onclick="closeModal('modal-add-sale')">&times;</button>
        </div>
        <form onsubmit="submitCounterSale(event)">
            <p class="modal-note">
                For walk-in sales only — parts over the counter, accessories, or other income.
                Service work is still billed when its job reaches Release.
            </p>
            <div class="input-group">
                <label>What was sold</label>
                <input type="text" id="sale_desc" placeholder="Item or service sold" required maxlength="255">
            </div>
            <div class="input-group">
                <label>Amount (PHP)</label>
                <input type="number" id="sale_amount" min="1" step="0.01" required>
            </div>
            <div class="input-group">
                <label>Date</label>
                <input type="date" id="sale_date" required>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;">Record Sale</button>
        </form>
    </div>
</div>
