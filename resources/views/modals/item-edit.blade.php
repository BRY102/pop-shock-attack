<div class="modal hidden app-sheet-modal" id="modal-edit-item">
    <div class="modal-content user-edit-sheet">
        <div class="user-edit-head">
            <div class="user-edit-title">
                <span class="user-edit-avatar" aria-hidden="true" data-icon="package"></span>
                <div>
                    <h2 id="itemModalTitle">Add New Item</h2>
                    <p id="itemModalSub">Add a consumable to the shop inventory.</p>
                </div>
            </div>
            <button type="button" class="user-edit-close" onclick="closeModal('modal-edit-item')" aria-label="Close">
                <span data-icon="x"></span>
            </button>
        </div>
        <form onsubmit="submitItemForm(event)">
            <input type="hidden" id="edit_item_mode" value="add">
            <input type="hidden" id="edit_item_id">

            <div class="user-edit-fields">
                <label class="user-edit-field">
                    <span class="user-edit-label">
                        <span data-icon="package"></span>
                        Item Name <em>*</em>
                    </span>
                    <span class="user-edit-shell">
                        <span class="user-edit-ico" data-icon="package"></span>
                        <input type="text" id="m_item_name" required autocomplete="off" placeholder="e.g. Touring Oil">
                    </span>
                </label>

                <label class="user-edit-field">
                    <span class="user-edit-label">
                        <span data-icon="file-text"></span>
                        Description <em>*</em>
                    </span>
                    <span class="user-edit-shell">
                        <span class="user-edit-ico" data-icon="file-text"></span>
                        <input type="text" id="m_item_desc" required autocomplete="off" placeholder="Short description">
                    </span>
                </label>

                <div class="user-edit-two">
                    <label class="user-edit-field">
                        <span class="user-edit-label">
                            <span data-icon="layers"></span>
                            Current Stock <em>*</em>
                        </span>
                        <span class="user-edit-shell">
                            <span class="user-edit-ico" data-icon="layers"></span>
                            <input type="number" id="m_item_stock" min="0" required placeholder="0">
                        </span>
                    </label>

                    <label class="user-edit-field">
                        <span class="user-edit-label">
                            <span data-icon="triangle-alert"></span>
                            Low Stock Alert <em>*</em>
                        </span>
                        <span class="user-edit-shell">
                            <span class="user-edit-ico" data-icon="triangle-alert"></span>
                            <input type="number" id="m_item_threshold" min="0" required placeholder="5">
                        </span>
                        <small class="user-edit-hint">
                            <span data-icon="info"></span>
                            <span>Alert when stock reaches this number.</span>
                        </small>
                    </label>
                </div>

                <label class="user-edit-field">
                    <span class="user-edit-label">
                        <span data-icon="circle-dollar"></span>
                        Item Price (₱) <em>*</em>
                    </span>
                    <span class="user-edit-shell">
                        <span class="user-edit-ico" data-icon="circle-dollar"></span>
                        <input type="number" id="m_item_price" step="0.01" min="0" required placeholder="0.00">
                    </span>
                </label>
            </div>

            <div class="user-edit-actions">
                <button type="button" class="user-edit-cancel" onclick="closeModal('modal-edit-item')">Cancel</button>
                <button type="submit" class="user-edit-save">
                    <span data-icon="save"></span>
                    <span id="itemEditSaveLabel">Save Item</span>
                </button>
            </div>
        </form>
    </div>
</div>