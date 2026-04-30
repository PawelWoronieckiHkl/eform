const deleteButtons = document.querySelectorAll('.btn-delete-shop');
const modal = new bootstrap.Modal(document.getElementById('deleteShopModal'));
const nameEl = document.getElementById('deleteShopName');
const confirmBtn = document.getElementById('confirmDeleteShop');
const i18n = (key) => (typeof t === 'function' ? t(key) : key);

let pendingDeleteId = null;

deleteButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        pendingDeleteId = btn.dataset.shopId;
        nameEl.textContent = btn.dataset.shopName;
        modal.show();
    });
});

confirmBtn?.addEventListener('click', async () => {
    if (!pendingDeleteId) return;

    const baseLabel = confirmBtn.textContent;
    confirmBtn.disabled = true;
    confirmBtn.textContent = i18n('group.deleting_progress');

    try {
        const res = await fetch(`/group/shops/${pendingDeleteId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();

        if (data.success) {
            modal.hide();
            const row = document.querySelector(`tr[data-shop-id="${pendingDeleteId}"]`);
            row?.remove();

            const tbody = document.querySelector('.group-shops-table tbody');
            if (tbody && tbody.children.length === 0) {
                window.location.reload();
            }
        } else {
            alert(data.message || i18n('group.error_delete'));
        }
    } catch (err) {
        alert(i18n('group.error_connection'));
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = baseLabel;
        pendingDeleteId = null;
    }
});
