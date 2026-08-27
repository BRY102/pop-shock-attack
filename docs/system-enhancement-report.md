# MotoTrack — System Enhancement Report (Tabulated)

**System:** Motorcycle Suspension Service and Operation Management System (MotoTrack)  
**Shop:** Pops Shock Attack, San Pedro, Laguna  
**Prepared for:** System tabulated documentation / capstone report  
**Scope:** Enhancements implemented on top of the baseline MotoTrack build (auth, 5-stage workflow, billing, inventory, dashboard, customer portal).

---

## 1. Summary by type

| Type | Count (approx.) | What it covers |
|---|---|---|
| New features | 6 | Password reset at the counter, mechanic roster, split job APIs, part prices in config, customer live-status illustration, assembly-line illustration |
| UI / UX polish | 10 | Mobile/tablet layout, Overview tiles and floor strip, request cards, login copy, form placeholders, kanban station headers |
| Security / hardening | 5 | Password min length 8, Sanctum expiry, login throttle, safer validation |
| Bug fixes | 4 | Broken Overview script, crushed request-card layout, Chrome-unrelated password warning explained, missing `}` on Low stock panel |

---

## 2. New features

| No. | Module | Enhancement | Before | After | Purpose |
|---|---|---|---|---|---|
| 2.1 | Auth / Staff | Counter password reset | Customer who forgot the password had no in-system path. | Customer submits “Forgot Password.” Staff sees it under **Pending Requests**, sets a temporary password, and tells the rider at the counter. | Shop can restore access without an email server. |
| 2.2 | Users / Workflow | Mechanic master list | Mechanic names were typed freely or loosely assigned. | **Shop mechanics** roster (add/remove). Staff assign from the list on Disassembly. | Consistent names for back-job reports and assignment. |
| 2.3 | Jobs API | Active vs released listings | One job list mixed floor work and released history. | `GET /api/jobs` = active (on the board). `GET /api/jobs/released` = released (Sales / Overview), optional date filter. | Faster Workflow; Sales and Overview still see completed jobs. |
| 2.4 | Billing | Part prices in config | Oil seal / dust seal / spring prices lived in service code. | Prices live in `config/shop.php` (`part_prices`). BillingService reads them. | Owner can change shop prices in one place. |
| 2.5 | Customer portal | Live status illustration | Small grey dots and tiny stage labels. | Icon per station, green check when done, red pulse + **Now** on the current stage, one-sentence status, “Updated …” from `updated_at`. | Rider can see where the bike is without asking the shop. |
| 2.6 | Workflow + Overview | Assembly-line illustration | Plain kanban headers; Overview “On the floor” was five unlabeled boxes. | Workflow: numbered stations (`01 Intake`), job-count badge, chevrons between columns, stronger header when a column has jobs. Overview: numbered stations, large icon on the right (same language as the 12 stat tiles), connector line. | Matches the professor note: improve assembly-line and live-status illustration. |

---

## 3. UI / UX enhancements

| No. | Screen | Enhancement | Before | After | Purpose |
|---|---|---|---|---|---|
| 3.1 | Whole app | Mobile / tablet layout | Sidebar and tables overflowed on phone and iPad. | Drawer nav at ≤1024px, stacked header, compact buttons, 2-column stats on phone, swipeable kanban, `responsive.css`. | Usable on the counter tablet and the rider’s phone. |
| 3.2 | Login | Copy and feature pills | Long tagline. | Short line: “Track your bike from drop-off to release.” Pills: Status / History / Warranty / Billing. | Faster to read during demo. |
| 3.3 | Navigation | Role labels | Longer menu names in places. | Admin: Overview, Workflow, Service History, Inventory, Sales, Manage Users. Staff: Workflow, Service History, Inventory, Pending Requests. | Shorter, role-clear labels. |
| 3.4 | Overview | 12 metric tiles | Same 12 metrics; later a failed “hero only” layout was reverted. | All 12 tiles kept (Daily → Needs Restock). Accent is a **left rail** (not a thick bottom stripe). Circular icon chip. Clearer labels. | Same data, easier to scan. |
| 3.5 | Overview | On the floor | Five equal boxes, then a compact strip, then a centered-icon strip. | Final: station number + count + name on the left, **large circular icon on the right** (like the stat tiles). Active stations use a red left rail. | Reads as a shop line, not a generic widget. |
| 3.6 | Overview | Low stock | Table → row cards → **table restored** (shop preference). | Original table: Consumable, Remaining, Alert Level, Status. Red left border on the panel. Shows only when an item is at or below alert. | Alert is still obvious; layout stays familiar. |
| 3.7 | Pending Requests | Request card layout | Content piled on the left; later a nested grid **broke** the username (`j / u / a / n` vertical). | Full-width row: avatar, name + date + badge, **Set Password / Approve** on the right. Phone: button under the details. | One request = one readable row. |
| 3.8 | Forms | Placeholders | Many fields used `e.g. John Hendrix`, `e.g. Click 125`. | Field name only: Mechanic name, Username, Motorcycle model, Brand name, Complaint or reason, Spring rate, Expense description, Suspension brand. | Tells the user *what* to type, not a sample person. |
| 3.9 | Customer names | Display | Raw stored casing. | `displayName()` title-cases customer names on cards and lists. | Cleaner presentation. |
| 3.10 | Dates on requests | Relative time | Full timestamps only. | `Aug 23 · 7h ago` style on request cards. | Faster to see how long a request has waited. |

---

## 4. Security and validation

| No. | Area | Enhancement | Before | After | Purpose |
|---|---|---|---|---|---|
| 4.1 | Passwords | Minimum length | Weaker / inconsistent length. | Minimum **8** characters (register, reset, user create/edit). Matches `config/shop.php` and frontend `PASSWORD_MIN_LENGTH`. | Basic password policy. |
| 4.2 | Sanctum | Token lifetime | Default / long-lived session. | Explicit expiry in `config/sanctum.php`. | Stolen tokens die after a set time. |
| 4.3 | Login | Throttle | Easier to brute-force. | Login attempts throttled. | Slows password guessing. |
| 4.4 | Forms | Server validation | Some client-only checks. | Form Requests updated (register, users, specs, mechanic assign, forgot/complete reset). | API rejects bad data even if the UI is bypassed. |
| 4.5 | Demo logins | Note (not a code change) | Chrome may warn that `admin123` / `staff123` / `pass1234` appeared in a breach. | That popup is **Google Password Manager**, not MotoTrack. | Avoids treating a browser warning as an app bug during defense. |

---

## 5. Bug fixes (this iteration)

| No. | Symptom | Cause | Fix |
|---|---|---|---|
| 5.1 | Overview blank; header stuck on “Dashboard / Overview” | `buildRestockPanel()` in `overview.js` was missing a closing `}`. The script failed to parse, so `renderOverview` never ran. | Closed the function. `node --check` passes. |
| 5.2 | `juan_rider` stacked one letter per line; Set Password overlapped | Always-on `responsive.css` packed cards into ~280px columns. `.btn-sm { width: 100% }` (kanban default) crushed the name column. Nested grid also used `overflow-wrap: anywhere`. | Grid is one full-width row. Button is `width: auto`. Name is `white-space: nowrap`. |
| 5.3 | Overview “hero + strip” layout rejected | Too dense / unlike the original 12-tile dashboard. | Reverted to 12 tiles. Later polish did **not** remove tiles. |
| 5.4 | Flat “paper” restyle rejected | Look no longer matched the red-gradient / white-card brand. | Restored original colors, radii, gradients, chart colors, login pills. Kept copy, mobile CSS, and backend. |

---

## 6. What did **not** change (on purpose)

| Item | Status |
|---|---|
| 12 Overview metric tiles (Daily, Weekly, Monthly, Yearly Sales, Total Revenue, Expenses, Net Profit, Services Rendered, Parts month/year, Back-job rate, Needs Restock) | Kept |
| Five workflow stages: Intake → Disassembly → Tuning → QA → Release | Kept |
| Warranty rule: 6 months from first Release; claim billed ₱0; second release does not extend the window | Kept |
| Server-side bill computation | Kept |
| Role split: Admin / Staff / Customer | Kept |

---

## 7. Files most affected (for the technical appendix)

| Layer | Files |
|---|---|
| Frontend layout | `public/css/base.css`, `components.css`, `layout.css`, `views.css`, `responsive.css` (new), `public/index.html` |
| Frontend views | `public/js/views/overview.js`, `kanban.js`, `customer.js`, `users.js`, `reports.js`, `router.js` |
| Shared JS | `public/js/ui.js`, `api.js`, `auth.js`, `actions.js`, `state.js` |
| Backend | `config/shop.php`, `BillingService.php`, `ServiceJobController.php`, `routes/api.php` |
| New backend | `MechanicController`, `PasswordResetController`, `mechanics` + `password_reset_requests` migrations, related Form Requests / Resources / tests |
| Tests | `JobListingTest.php`, `MechanicTest.php`, `PasswordResetTest.php`, `AuthHardeningTest.php` |

---

## 8. Suggested wording for the printed system report

**Enhancements implemented in this iteration focused on (1) shop-floor and customer illustrations of the service line, (2) usable tablet/phone layout, (3) counter password reset and a mechanic roster, and (4) clearer Overview and request cards—without changing the 12 dashboard metrics or the five-stage business rules.**

---

## 9. Possible next items (warranty — for another adviser)

Not built yet; listed only if the panel asks “what’s next”:

| Idea | One-line rationale |
|---|---|
| Expiring-soon list (30 days) | Shop sees units about to lose coverage |
| Official warranty certificate + QR | Proof at the counter |
| Claim timeline per plate | Audit trail of free re-services |
| SMS/email before expiry | Rider is told before the window closes |
