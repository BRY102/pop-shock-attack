<!-- Release & Settlement Modal (Staff & Admin) -->
<div class="modal hidden" id="modal-release-checkout">
    <div class="modal-content modal-checkout">
        <div class="modal-header">
            <h2>Release &amp; Settlement</h2>
            <button type="button" class="modal-close" onclick="cancelReleaseCheckout()">&times;</button>
        </div>
        <form id="releaseCheckoutForm" onsubmit="submitReleaseCheckout(event)">
            <input type="hidden" id="co_job_id">

            <!-- Unit & Customer Summary Card -->
            <div class="checkout-summary-card">
                <div class="checkout-unit-main">
                    <span class="checkout-unit-plate" id="co_plate">NMAX-1234</span>
                    <h3 class="checkout-unit-model" id="co_model">Yamaha NMAX 155</h3>
                    <p class="checkout-unit-customer">Customer: <strong id="co_customer">Juan Rider</strong></p>
                </div>
                <div class="checkout-unit-tech">
                    <span class="checkout-tech-badge" id="co_tech">Lead Tech: Rico</span>
                </div>
            </div>

            <!-- Warranty Claim Banner (if applicable) -->
            <div id="co_warranty_banner" class="checkout-claim-banner hidden">
                <div class="checkout-claim-icon">🛡️</div>
                <div class="checkout-claim-copy">
                    <strong>Re-Service Warranty Claim</strong>
                    <p>This unit is covered by active 6-month warranty. Billed at ₱0.00 (Free of Charge).</p>
                </div>
            </div>

            <!-- Bill Items Breakdown -->
            <div class="checkout-bill-box">
                <div class="checkout-bill-header">
                    <span>Billed Items</span>
                    <span id="co_bill_subtotal">₱0.00</span>
                </div>
                <div class="checkout-bill-lines" id="co_bill_lines">
                    <!-- Populated by JS -->
                </div>
                <div class="checkout-total-row">
                    <span>Total Due</span>
                    <strong class="checkout-total-due" id="co_total_due">₱0.00</strong>
                </div>
            </div>

            <!-- Payment Method Section -->
            <div class="checkout-payment-section" id="co_payment_section">
                <label class="checkout-section-label">Payment Method</label>
                <div class="checkout-methods-grid">
                    <label class="checkout-method-option">
                        <input type="radio" name="co_payment_method" value="Cash" checked
                            onchange="toggleCheckoutPaymentFields()">
                        <span class="checkout-method-pill">
                            <span class="method-icon">💵</span>
                            <strong>Cash</strong>
                        </span>
                    </label>
                    <label class="checkout-method-option">
                        <input type="radio" name="co_payment_method" value="GCash"
                            onchange="toggleCheckoutPaymentFields()">
                        <span class="checkout-method-pill">
                            <span class="method-icon">📱</span>
                            <strong>GCash</strong>
                        </span>
                    </label>
                    <label class="checkout-method-option">
                        <input type="radio" name="co_payment_method" value="Bank Transfer"
                            onchange="toggleCheckoutPaymentFields()">
                        <span class="checkout-method-pill">
                            <span class="method-icon">🏦</span>
                            <strong>Bank</strong>
                        </span>
                    </label>
                </div>

                <!-- Cash Input Group -->
                <div id="co_cash_fields" class="checkout-payment-fields">
                    <div class="input-row">
                        <div class="input-group">
                            <label for="co_amount_tendered">Cash Received (₱)</label>
                            <input type="number" id="co_amount_tendered" step="any" min="0" placeholder="0.00"
                                oninput="computeCheckoutChange()">
                        </div>
                        <div class="input-group">
                            <label for="co_change">Sukli / Change</label>
                            <input type="text" id="co_change" readonly value="₱0.00" class="is-readonly-change">
                        </div>
                    </div>
                </div>

                <!-- Digital / Bank Reference Group -->
                <div id="co_ref_fields" class="checkout-payment-fields hidden">
                    <div class="input-group">
                        <label for="co_reference_no">Reference Number / Transaction ID</label>
                        <input type="text" id="co_reference_no" placeholder="e.g. 102938475621">
                    </div>
                </div>

                <div class="input-group" style="margin-top: 0.5rem;">
                    <label for="co_notes">Payment Note / Remarks (Optional)</label>
                    <input type="text" id="co_notes" placeholder="e.g. Paid in full at counter">
                </div>
            </div>

            <div class="checkout-receipt-check">
                <label>
                    <input type="checkbox" id="co_print_receipt" checked>
                    <span>Print thermal receipt after release</span>
                </label>
            </div>

            <div class="modal-actions" style="margin-top: 1.25rem;">
                <button type="button" class="btn btn-muted" onclick="cancelReleaseCheckout()">Cancel</button>
                <button type="submit" class="btn btn-primary" id="co_submit_btn">Confirm &amp; Release</button>
            </div>
        </form>
    </div>
</div>