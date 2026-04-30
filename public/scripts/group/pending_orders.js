/**
 * Pending orders management for group users.
 * Approve or reject shop orders via REST endpoints.
 */
(function () {
    'use strict';
    const i18n = (key) => (typeof t === 'function' ? t(key) : key);

    const approveModal = new bootstrap.Modal(document.getElementById('approveModal'));
    const rejectModal  = new bootstrap.Modal(document.getElementById('rejectModal'));

    let pendingOrderId = null;

    // ── Zatwierdź ─────────────────────────────────────────────────────────────

    document.querySelectorAll('.js-approve-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            pendingOrderId = btn.dataset.orderId;
            approveModal.show();
        });
    });

    document.getElementById('approveConfirmBtn').addEventListener('click', async () => {
        if (!pendingOrderId) return;
        approveModal.hide();
        await sendAction(`/group/approve-order/${pendingOrderId}`, 'POST');
    });

    // ── Odrzuć ────────────────────────────────────────────────────────────────

    document.querySelectorAll('.js-reject-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            pendingOrderId = btn.dataset.orderId;
            rejectModal.show();
        });
    });

    document.getElementById('rejectConfirmBtn').addEventListener('click', async () => {
        if (!pendingOrderId) return;
        rejectModal.hide();
        await sendAction(`/group/reject-order/${pendingOrderId}`, 'POST');
    });

    // ── Helper ────────────────────────────────────────────────────────────────

    async function sendAction(url, method) {
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
            });
            const data = await res.json();
            if (data.redirect) {
                window.location.href = data.redirect;
            } else {
                window.location.reload();
            }
        } catch (err) {
            console.error('Błąd:', err);
            alert(i18n('group.error_server_retry'));
        }
    }
}());
