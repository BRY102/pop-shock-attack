<div class="modal hidden" id="modal-add-stock">
    <div class="modal-content modal-narrow">
        <div class="modal-header">
            <h2>Add Stock</h2>
            <button class="modal-close" onclick="closeModal('modal-add-stock')">&times;</button>
        </div>
        <form onsubmit="submitAddStock(event)">
            <input type="hidden" id="add_stock_item_id">

            <p style="margin-bottom: 1.5rem; font-size: 1.05rem; color: #555;">
                Adding stock for:<br>
                <strong id="add_stock_item_name" style="color: var(--text-primary); font-size: 1.3rem;"></strong>
            </p>
            <div class="input-group">
                <label>Quantity to Add</label>
                <input type="number" id="add_stock_qty" min="1" value="10" required>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;">Confirm Add Stock</button>
        </form>
    </div>
</div>