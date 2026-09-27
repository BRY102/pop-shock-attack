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
                    <span class="checkout-tech-badge" id="co_tech">Lead Mech: Rico</span>
                </div>
            </div>

            <!-- Warranty Claim Banner (if applicable) -->
            <div id="co_warranty_banner" class="checkout-claim-banner hidden">
                <div class="checkout-claim-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 22px; height: 22px;">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <path d="m9 12 2 2 4-4" />
                    </svg>
                </div>
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
                            <span class="method-icon method-icon-cash" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect width="20" height="12" x="2" y="6" rx="2"></rect>
                                    <circle cx="12" cy="12" r="2.5"></circle>
                                    <path d="M6 12h.01M18 12h.01"></path>
                                </svg>
                            </span>
                            <strong>Cash</strong>
                        </span>
                    </label>
                    <label class="checkout-method-option">
                        <input type="radio" name="co_payment_method" value="GCash"
                            onchange="toggleCheckoutPaymentFields()">
                        <span class="checkout-method-pill">
                            <span class="method-icon method-icon-gcash" aria-hidden="true">
                                <img src="/img/gcash-icon.svg" alt="GCash" class="method-icon-gcash-img">
                            </span>
                            <strong>GCash</strong>
                        </span>
                    </label>
                    <label class="checkout-method-option">
                        <input type="radio" name="co_payment_method" value="Bank Transfer"
                            onchange="toggleCheckoutPaymentFields()">
                        <span class="checkout-method-pill">
                            <span class="method-icon method-icon-bank" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="3" y1="21" x2="21" y2="21"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                    <path d="m3 10 9-7 9 7"></path>
                                    <line x1="6" y1="10" x2="6" y2="21"></line>
                                    <line x1="10" y1="10" x2="10" y2="21"></line>
                                    <line x1="14" y1="10" x2="14" y2="21"></line>
                                    <line x1="18" y1="10" x2="18" y2="21"></line>
                                </svg>
                            </span>
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
                            <label for="co_change">Change</label>
                            <input type="text" id="co_change" readonly value="₱0.00" class="is-readonly-change">
                        </div>
                    </div>
                </div>

                <!-- Digital / Bank Reference Group -->
                <div id="co_ref_fields" class="checkout-payment-fields hidden">
                    <div class="input-group">
                        <label for="co_reference_no">Ref No.</label>
                        <input type="text" id="co_reference_no" placeholder="Ref No.">
                    </div>
                </div>

                <div class="input-group" style="margin-top: 0.5rem;">
                    <label for="co_notes">Payment Note / Remarks (Optional)</label>
                    <input type="text" id="co_notes" placeholder="Paid in full at counter">
                </div>
            </div>

            <div class="checkout-receipt-check">
                <label>
                    <input type="checkbox" id="co_print_receipt">
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