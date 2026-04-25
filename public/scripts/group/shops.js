const deleteButtons = document.querySelectorAll('.btn-delete-shop');
const modal = new bootstrap.Modal(document.getElementById('deleteShopModal'));
const nameEl = document.getElementById('deleteShopName');
const confirmBtn = document.getElementById('confirmDeleteShop');

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

    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Usuwanie…';

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
            alert(data.message || 'Błąd podczas usuwania sklepu.');
        }
    } catch (err) {
        alert('Błąd połączenia z serwerem.');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Usuń';
        pendingDeleteId = null;
    }
});
