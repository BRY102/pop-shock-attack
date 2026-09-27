<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>MotoTrack | Premium Operations</title>
    <script src="js/vendor/chart.umd.min.js"></script>
    <!-- Speed up the Google Fonts load referenced from css/base.css -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <!-- Load order: tokens → layout → components → views (features/*) → responsive -->
    <link rel="stylesheet" href="css/base.css">
    <link rel="stylesheet" href="css/layout.css">
    <link rel="stylesheet" href="css/components.css">
    <link rel="stylesheet" href="css/views.css">
    <link rel="stylesheet" href="css/responsive.css">
</head>

<body>
    {{-- 1. Login / Register / Forgot Overlay (Staff & Customer) --}}
    @include('auth.login-overlay')

    {{-- 2. Main System Interface (Sidebar + Top Header + Workspace Canvas) --}}
    <div id="view-system" class="view-section hidden">
        @include('layouts.sidebar')

        <main class="main-content">
            @include('layouts.header')
            @include('layouts.canvas')
        </main>
    </div>

    {{-- 3. Side Drawers --}}
    @include('layouts.feedback-drawer')

    {{-- 4. Modular Action & CRUD Modals --}}
    @include('modals.intake')
    @include('modals.specs')
    @include('modals.item-edit')
    @include('modals.user-manage')
    @include('modals.reset-password')
    @include('modals.add-stock')
    @include('modals.expenses')
    @include('modals.counter-sale')
    @include('modals.reviews-audits')
    @include('modals.bill-detail')
    @include('modals.mechanic')
    @include('modals.confirmations')
    @include('modals.checkout')
    @include('modals.password')
    @include('modals.activity-log')

    {{-- 5. Toast Notifications & Loading State --}}
    <div id="toastContainer" class="toast-container"></div>

    <div id="loginLoader" class="login-loader hidden" role="status" aria-live="polite" aria-hidden="true">
        <div class="login-loader-mark">
            <svg class="login-loader-ring" viewBox="0 0 120 120" aria-hidden="true">
                <circle class="login-loader-track" cx="60" cy="60" r="54"></circle>
                <circle class="login-loader-arc" cx="60" cy="60" r="54"></circle>
            </svg>
            <div class="login-loader-well">
                <img src="img/logo-psa.png" alt="" class="login-loader-logo">
            </div>
        </div>
        <span class="sr-only">Signing in</span>
    </div>

    {{-- 6. Modular JavaScript Architecture --}}
    <script src="js/state.js"></script>
    <script src="js/ui.js"></script>
    <script src="js/billing.js"></script>
    <script src="js/api.js"></script>
    <script src="js/auth.js"></script>
    <script src="js/router.js"></script>
    <script src="js/features/overview/overview-state.js"></script>
    <script src="js/features/overview/overview-stats.js"></script>
    <script src="js/features/overview/overview-panels.js"></script>
    <script src="js/features/overview/overview-charts.js"></script>
    <script src="js/features/overview/overview.js"></script>
    <script src="js/features/workflow/kanban.js"></script>
    <script src="js/features/workflow/kanban-live.js"></script>
    <script src="js/features/transactions/transactions.js"></script>
    <script src="js/features/history/history.js"></script>
    <script src="js/features/warranty/warranty.js"></script>
    <script src="js/features/inventory/inventory.js"></script>
    <script src="js/features/reports/reports.js"></script>
    <script src="js/features/backjobs/backjobs-state.js"></script>
    <script src="js/features/backjobs/backjobs-data.js"></script>
    <script src="js/features/backjobs/backjobs-panels.js"></script>
    <script src="js/features/backjobs/backjobs.js"></script>
    <script src="js/features/users/users.js"></script>
    <script src="js/features/customer/customer.js"></script>
    <script src="js/notifications.js"></script>
    <script src="js/profile.js"></script>
    <script src="js/feedback.js"></script>
    <script src="js/actions/shared.js"></script>
    <script src="js/actions/workflow.js"></script>
    <script src="js/actions/inventory.js"></script>
    <script src="js/actions/users.js"></script>
    <script src="js/actions/expenses.js"></script>
    <script src="js/receipt.js"></script>
    <script src="js/main.js"></script>
</body>

</html>