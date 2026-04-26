(function () {
    'use strict';
    const I18N = JSON.parse(document.getElementById('gp-i18n').textContent);

    // ── Copy credentials ──────────────────────────────────────────────────────
    document.querySelectorAll('.btn-copy-creds').forEach(btn => {
        btn.addEventListener('click', async function() {
            const val = `PIN: ${this.getAttribute('data-pin')}\nPassword: ${this.getAttribute('data-pass')}`;
            let copied = false;
            if (navigator.clipboard && window.isSecureContext) {
                try {
                    await navigator.clipboard.writeText(val);
                    copied = true;
                } catch {}
            }
            if (!copied) {
                const textarea = document.createElement('textarea');
                textarea.value = val;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                try { document.execCommand('copy'); copied = true; } catch {}
                document.body.removeChild(textarea);
            }
            if (copied) {
                this.classList.add('copied');
                const labelCopied = this.getAttribute('data-label-copied');
                const labelCopy = this.getAttribute('data-label-copy');
                this.title = labelCopied;
                setTimeout(() => { this.classList.remove('copied'); this.title = labelCopy; }, 1200);
            }
        });
    });

    // ── Tab switching ─────────────────────────────────────────────────────────
    const tabs = document.querySelectorAll('.gp-tab');
    const panes = document.querySelectorAll('.gp-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            // orders/pending have server-side data, navigate fully
            if (target === 'orders' || target === 'pending') {
                window.location.href = `/group/panel?tab=${target}`;
                return;
            }
            tabs.forEach(t => t.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.querySelector(`.gp-pane[data-pane="${target}"]`)?.classList.add('active');
            history.replaceState(null, '', `/group/panel?tab=${target}`);
        });
    });

    // ── Delete shop ───────────────────────────────────────────────────────────
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteShopModal'));
    const deleteNameEl = document.getElementById('deleteShopName');
    const confirmDeleteBtn = document.getElementById('confirmDeleteShop');
    let pendingDeleteId = null;

    document.querySelectorAll('.btn-delete-shop').forEach(btn => {
        btn.addEventListener('click', () => {
            pendingDeleteId = btn.dataset.shopId;
            deleteNameEl.textContent = btn.dataset.shopName;
            deleteModal.show();
        });
    });

    confirmDeleteBtn?.addEventListener('click', async () => {
        if (!pendingDeleteId) return;
        const baseLabel = confirmDeleteBtn.dataset.label || confirmDeleteBtn.textContent;
        const progressLabel = confirmDeleteBtn.dataset.labelProgress || I18N.deletingProgress;
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.textContent = progressLabel;
        try {
            const res = await fetch(`/group/shops/${pendingDeleteId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success) {
                deleteModal.hide();
                window.location.href = '/group/panel?tab=shops&success=deleted';
            } else {
                alert(data.message || I18N.deleteError);
            }
        } catch (err) {
            alert(I18N.connError);
        } finally {
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.textContent = baseLabel;
            pendingDeleteId = null;
        }
    });

    // ── Approve / Reject ──────────────────────────────────────────────────────
    const approveModal = new bootstrap.Modal(document.getElementById('approveModal'));
    const rejectModal  = new bootstrap.Modal(document.getElementById('rejectModal'));
    let pendingOrderId = null;

    document.querySelectorAll('.js-approve-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            pendingOrderId = btn.dataset.orderId;
            approveModal.show();
        });
    });

    document.getElementById('approveConfirmBtn')?.addEventListener('click', async () => {
        if (!pendingOrderId) return;
        approveModal.hide();
        await sendOrderAction(`/group/approve-order/${pendingOrderId}`);
    });

    document.querySelectorAll('.js-reject-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            pendingOrderId = btn.dataset.orderId;
            rejectModal.show();
        });
    });

    document.getElementById('rejectConfirmBtn')?.addEventListener('click', async () => {
        if (!pendingOrderId) return;
        rejectModal.hide();
        await sendOrderAction(`/group/reject-order/${pendingOrderId}`);
    });

    async function sendOrderAction(url) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
            });
            const data = await res.json();
            window.location.href = data.redirect || '/group/panel?tab=pending';
        } catch (err) {
            console.error(err);
            alert(I18N.serverError);
        }
    }

    // Auto-dismiss alerts
    const alertEl = document.getElementById('gp-alert');
    if (alertEl) setTimeout(() => alertEl.remove(), 4000);

    // ── Shop filter dropdown ──────────────────────────────────────────────────
    const shopFilterSel = document.getElementById('gpShopFilter');
    if (shopFilterSel) {
        shopFilterSel.addEventListener('change', () => {
            const shopId = shopFilterSel.value;
            const sent = shopFilterSel.dataset.sent === 'true';
            const params = new URLSearchParams();
            params.set('tab', 'orders');
            if (sent) params.set('sent', 'true');
            if (shopId) params.set('shop', shopId);
            window.location.href = `/group/panel?${params.toString()}`;
        });
    }
}());
