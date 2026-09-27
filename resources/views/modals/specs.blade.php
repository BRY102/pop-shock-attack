<div class="modal hidden" id="modal-specs">
    <div class="modal-content specs-sheet">
        <div class="specs-head">
            <span class="specs-title-ico" data-icon="cog"></span>
            <div>
                <h2>Log Tuning Specs &amp; Billing</h2>
                <p>Enter the motorcycle details, tuning specifications, and billing information for this service.</p>
            </div>
            <button type="button" class="modal-close" onclick="closeModal('modal-specs')" aria-label="Close">
                <span data-icon="x"></span>
            </button>
        </div>
        <form class="specs-form" onsubmit="submitSpecs(event)">
            <input type="hidden" id="spec_job_id">

            <div id="spec_warranty_proof" class="specs-warranty"></div>

            <div class="specs-grid">
                <section class="specs-card">
                    <div class="specs-card-head">
                        <span data-icon="bike"></span>
                        <h3>Motorcycle Class</h3>
                    </div>
                    <label class="specs-field">
                        <span>Base Front Shock Price</span>
                        <span class="specs-select">
                            <select id="spec_engine" required></select>
                        </span>
                    </label>
                    <div class="specs-rule"></div>
                    <div class="specs-card-head">
                        <span data-icon="sliders"></span>
                        <h3>Suspension Setup (Technical Log)</h3>
                    </div>
                    <label class="specs-field">
                        <span>Suspension Type</span>
                        <span class="specs-select">
                            <select id="spec_susp_type" required></select>
                        </span>
                    </label>
                    <label class="specs-field">
                        <span>Suspension Brand</span>
                        <span class="specs-select">
                            <select id="spec_susp_brand" required onchange="toggleOtherSuspensionBrand()"></select>
                        </span>
                    </label>
                    <label class="specs-field hidden" id="otherSuspBrandGroup">
                        <span>Other Suspension Brand</span>
                        <input type="text" id="spec_susp_brand_other" placeholder="Suspension brand">
                    </label>
                    <label class="specs-field">
                        <span>Fork Oil Viscosity</span>
                        <span class="specs-select">
                            <select id="spec_oil_viscosity" required></select>
                        </span>
                    </label>
                </section>

                <section class="specs-card specs-billing">
                    <div class="specs-bill-head">
                        <span class="specs-mini-ico" data-icon="receipt"></span>
                        <h3>Billing Information</h3>
                    </div>
                    <label class="specs-field">
                        <span>Oil Type Used</span>
                        <span class="specs-select">
                            <select id="spec_oil" required>
                                <option value="Daily Oil">Daily Oil</option>
                                <option value="Touring Oil">Touring Oil</option>
                                <option value="Racing Oil">Racing Oil</option>
                            </select>
                        </span>
                    </label>
                    <div class="specs-triple">
                        <label class="specs-field">
                            <span>Oil Seal Size</span>
                            <span class="specs-select">
                                <select id="spec_oil_seal">
                                    <option value="None">None</option>
                                    <option value="Oil Seal 12x31x10.5">Oil Seal 12x31x10.5</option>
                                    <option value="Oil Seal 15x35x10">Oil Seal 15x35x10</option>
                                    <option value="Oil Seal 41x54x11">Oil Seal 41x54x11</option>
                                </select>
                            </span>
                        </label>
                        <label class="specs-field">
                            <span>Qty</span>
                            <input type="number" id="spec_oil_seal_qty" value="0" min="0" max="2">
                        </label>
                        <label class="specs-field">
                            <span>Side</span>
                            <span class="specs-select">
                                <select id="spec_oil_seal_side">
                                    <option value="N/A">N/A</option>
                                    <option value="Left">Left</option>
                                    <option value="Right">Right</option>
                                    <option value="Both">Both</option>
                                </select>
                            </span>
                        </label>
                    </div>
                    <div class="specs-triple">
                        <label class="specs-field">
                            <span>Dust Seal Size</span>
                            <span class="specs-select">
                                <select id="spec_dust_seal">
                                    <option value="None">None</option>
                                    <option value="Dust Seal 41x54x11">Dust Seal 41x54x11</option>
                                    <option value="Dust Seal 43x54x11">Dust Seal 43x54x11</option>
                                </select>
                            </span>
                        </label>
                        <label class="specs-field">
                            <span>Qty</span>
                            <input type="number" id="spec_dust_seal_qty" value="0" min="0" max="2">
                        </label>
                        <label class="specs-field">
                            <span>Side</span>
                            <span class="specs-select">
                                <select id="spec_dust_seal_side">
                                    <option value="N/A">N/A</option>
                                    <option value="Left">Left</option>
                                    <option value="Right">Right</option>
                                    <option value="Both">Both</option>
                                </select>
                            </span>
                        </label>
                    </div>
                    <label class="specs-field">
                        <span>Lowering Springs</span>
                        <span class="specs-select">
                            <select id="spec_springs">
                                <option value="None">None (Stock Springs)</option>
                                <option value="Lowering Spring 1.0 inch">Lowering Spring 1.0 inch</option>
                                <option value="Lowering Spring 1.5 inch">Lowering Spring 1.5 inch</option>
                                <option value="Lowering Spring 2.0 inch">Lowering Spring 2.0 inch</option>
                            </select>
                        </span>
                    </label>
                    <button type="submit" class="specs-compute">
                        <span data-icon="clipboard-list"></span>
                        Compute Bill &amp; Advance to QA
                        <span data-icon="chevron-right"></span>
                    </button>
                </section>
            </div>

            <p class="specs-note">
                <span data-icon="info"></span>
                All information will be saved and will be used for service tracking and billing.
            </p>
        </form>
    </div>
</div>