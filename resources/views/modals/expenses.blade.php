<div class="modal hidden" id="modal-add-expense">
    <div class="modal-content modal-wide">
        <div class="modal-header exp-head">
            <h2>Log Detailed Shop Expense</h2>
            <button type="button" class="modal-close" onclick="closeModal('modal-add-expense')">&times;</button>
        </div>
        <p class="exp-head-date" id="exp_today_label"></p>
        <form class="exp-form" onsubmit="submitExpense(event)">
            <div class="exp-grid">
                <div class="input-group">
                    <label class="exp-label" for="exp_category"><span class="exp-label-icon" data-icon="tag"></span>
                        Expense Category</label>
                    <select id="exp_category" required>
                        <option value="Utilities">Utilities</option>
                        <option value="Rent">Rent</option>
                        <option value="Inventory Restock">Inventory Restock</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Miscellaneous">Miscellaneous</option>
                    </select>
                </div>
                <div class="input-group">
                    <label class="exp-label" for="exp_date"><span class="exp-label-icon"
                            data-icon="calendar"></span> Date of Expense</label>
                    <input type="date" id="exp_date" required>
                </div>
                <div class="input-group exp-amount">
                    <label class="exp-label" for="exp_amount"><span class="exp-label-icon"
                            data-icon="circle-dollar"></span> Amount (PHP)</label>
                    <input type="number" id="exp_amount" min="0.01" step="0.01" placeholder="0.00" required>
                    <p class="exp-hint">Total cost including tax</p>
                </div>
            </div>
            <div class="input-group">
                <div class="exp-label-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                    <label class="exp-label" for="exp_desc" style="margin-bottom: 0;">
                        <span class="exp-label-icon" data-icon="file-text"></span>
                        Notes &amp; Detailed Description
                    </label>
                    <span class="exp-counter" id="exp_desc_counter" style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">
                        <span id="exp_desc_count">0</span> / 225
                    </span>
                </div>
                <textarea id="exp_desc" rows="4" maxlength="225" required
                    placeholder="Describe the expense include vendor name, invoice number, or itemized details"
                    oninput="updateExpenseDescCounter(this)"></textarea>
            </div>
            <div class="exp-actions">
                <button type="button" class="btn btn-muted"
                    onclick="closeModal('modal-add-expense')">Cancel</button>
                <button type="submit" class="btn btn-expense">Record Expense</button>
            </div>
        </form>
    </div>
</div>