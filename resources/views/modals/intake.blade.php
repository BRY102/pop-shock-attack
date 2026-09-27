<div class="modal hidden" id="modal-intake">
    <div class="modal-content intake-sheet">
        <div class="modal-header intake-head">
            <div>
                <h2 id="intakeTitle">Register New Intake</h2>
                <p class="intake-sub" id="intakeSub">Fill in the details below to create a new intake record.</p>
            </div>
            <button type="button" class="modal-close" onclick="closeModal('modal-intake')" aria-label="Close">
                <span class="intake-control-ico" data-icon="x"></span>
            </button>
        </div>
        <div class="intake-body">
            <aside class="intake-info">
                <div class="intake-art" aria-hidden="true">
                    <span class="intake-art-circle"></span>
                    <span class="intake-art-dot intake-dot-one"></span>
                    <span class="intake-art-dot intake-dot-two"></span>
                    <span class="intake-art-dot intake-dot-three"></span>
                    <div class="intake-clipboard">
                        <span class="intake-clip"></span>
                        <i></i><i></i><i></i>
                    </div>
                    <div class="intake-bike">
                        <svg viewBox="0 0 640 512" fill="currentColor" aria-hidden="true">
                            <path
                                d="M280 32c-13.3 0-24 10.7-24 24s10.7 24 24 24l57.7 0 16.4 30.3L256 192l-45.3-45.3c-12-12-28.3-18.7-45.3-18.7L64 128c-17.7 0-32 14.3-32 32l0 32 96 0c88.4 0 160 71.6 160 160c0 11-1.1 21.7-3.2 32l70.4 0c-2.1-10.3-3.2-21-3.2-32c0-52.2 25-98.6 63.7-127.8l15.4 28.6C402.4 276.3 384 312 384 352c0 70.7 57.3 128 128 128s128-57.3 128-128s-57.3-128-128-128c-13.5 0-26.5 2.1-38.7 6L418.2 128l61.8 0c17.7 0 32-14.3 32-32l0-32c0-17.7-14.3-32-32-32l-20.4 0c-7.5 0-14.7 2.6-20.5 7.4L391.7 78.9l-14-26c-7-12.9-20.5-21-35.2-21L280 32zM462.7 311.2l28.2 52.2c6.3 11.7 20.9 16 32.5 9.7s16-20.9 9.7-32.5l-28.2-52.2c2.3-.3 4.7-.4 7.1-.4c35.3 0 64 28.7 64 64s-28.7 64-64 64s-64-28.7-64-64c0-15.5 5.5-29.7 14.7-40.8zM187.3 376c-9.5 23.5-32.5 40-59.3 40c-35.3 0-64-28.7-64-64s28.7-64 64-64c26.9 0 49.9 16.5 59.3 40l66.4 0C242.5 268.8 190.5 224 128 224C57.3 224 0 281.3 0 352s57.3 128 128 128c62.5 0 114.5-44.8 125.8-104l-66.4 0zM128 384a32 32 0 1 0 0-64 32 32 0 1 0 0 64z" />
                        </svg>
                    </div>
                </div>
                <div class="intake-lead">
                    <span class="intake-control-ico" data-icon="shield-check"></span>
                    <strong>Accurate intake, smoother service.</strong>
                </div>
                <p>Provide complete and correct information to help us serve your customer better.</p>
                <div class="intake-benefits">
                    <div class="intake-benefit">
                        <span class="intake-control-ico" data-icon="user"></span>
                        <div>
                            <strong>Easy customer lookup</strong>
                            <small>Find existing customers quickly.</small>
                        </div>
                    </div>
                    <div class="intake-benefit">
                        <span class="intake-control-ico" data-icon="file-text"></span>
                        <div>
                            <strong>Complete vehicle details</strong>
                            <small>Helps ensure accurate diagnostics.</small>
                        </div>
                    </div>
                    <div class="intake-benefit">
                        <span class="intake-control-ico" data-icon="calendar"></span>
                        <div>
                            <strong>Track every intake</strong>
                            <small>Stay organized and on top of all jobs.</small>
                        </div>
                    </div>
                </div>
            </aside>
            <form class="intake-form" onsubmit="submitIntakeForm(event)">
                <div class="intake-section-title">Customer &amp; Vehicle Information <i></i></div>

                <label class="intake-field">
                    <span class="intake-label">Customer Username <b>*</b></span>
                    <span class="intake-control">
                        <span class="intake-control-ico" data-icon="user"></span>
                        <input type="text" id="in_cust" required autocomplete="off" placeholder="Username">
                    </span>
                    <small>This will be used for the customer to log in.</small>
                </label>

                <div class="intake-two-col">
                    <div class="intake-field">
                        <span class="intake-label">Motorcycle Brand <b>*</b></span>
                        <div class="intake-dropdown">
                            <select id="in_brand" class="intake-brand-native" required tabindex="-1"
                                aria-hidden="true"></select>
                            <button type="button" class="intake-control intake-select" id="in_brand_btn"
                                aria-haspopup="listbox" aria-expanded="false" aria-controls="in_brand_menu"
                                onclick="toggleIntakeBrandMenu(event)">
                                <span class="intake-brand-mark" id="in_brand_mark" aria-hidden="true">H</span>
                                <span class="intake-brand-text" id="in_brand_label">Honda</span>
                            </button>
                            <div class="intake-dropdown-menu hidden" id="in_brand_menu" role="listbox"></div>
                        </div>
                    </div>
                    <label class="intake-field">
                        <span class="intake-label">Motorcycle Model <b>*</b></span>
                        <span class="intake-control">
                            <input type="text" id="in_moto" placeholder="Select model" required autocomplete="off">
                        </span>
                    </label>
                </div>

                <label class="intake-field hidden" id="otherBrandGroup">
                    <span class="intake-label">Other Brand Name <b>*</b></span>
                    <span class="intake-control">
                        <input type="text" id="in_brand_other" placeholder="Brand name">
                    </span>
                </label>

                <label class="intake-field">
                    <span class="intake-label">Plate / Engine No. <b>*</b></span>
                    <span class="intake-control">
                        <span class="intake-control-ico" data-icon="file-text"></span>
                        <input type="text" id="in_plate" required placeholder="Enter plate or engine number"
                            autocomplete="off">
                    </span>
                </label>

                <div class="intake-two-col">
                    <label class="intake-field">
                        <span class="intake-label">Date In <b>*</b></span>
                        <span class="intake-control intake-date">
                            <span class="intake-control-ico" data-icon="calendar"></span>
                            <input type="date" id="in_date" required>
                        </span>
                    </label>
                    <label class="intake-field">
                        <span class="intake-label">Time In <b>*</b></span>
                        <span class="intake-control intake-date">
                            <span class="intake-control-ico" data-icon="clock"></span>
                            <input type="time" id="in_time" required>
                        </span>
                    </label>
                </div>

                <label class="intake-field">
                    <span class="intake-label">Why It Came In <b>*</b></span>
                    <span class="intake-textarea-wrap">
                        <textarea id="in_complaint" required maxlength="500"
                            placeholder="Describe the complaint or reason for service..."
                            oninput="updateIntakeComplaintCount()"></textarea>
                        <span id="in_complaint_count">0 / 500</span>
                    </span>
                </label>

                <div class="intake-actions">
                    <button type="button" class="btn btn-muted" onclick="closeModal('modal-intake')">Cancel</button>
                    <button type="submit" class="btn btn-primary">
                        <span class="intake-control-ico" data-icon="clipboard-list"></span>
                        <span id="intakeSubmitLabel">Register Intake</span>
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>