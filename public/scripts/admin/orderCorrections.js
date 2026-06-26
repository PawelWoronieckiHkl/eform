import { showToast } from '../components/toast.js';
import { confirmPrompt } from '../components/confirmPrompt.js';

document.querySelectorAll('.open-correction-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
        const orderId = btn.dataset.orderId;
        const confirmed = await confirmPrompt({
            title: 'Otwórz do korekty',
            message: 'Otworzyć zamówienie do korekty? Zamówienie będzie tymczasowo niedostępne dla klienta.',
            confirmLabel: 'Otwórz',
            cancelLabel: 'Anuluj',
            confirmClass: 'btn btn-warning'
        });
        if (!confirmed) return;

        btn.disabled = true;
        try {
            const res = await fetch(`/admin/order-corrections/${orderId}/open`, {
                method: 'POST',
                headers: { 'Accept': 'application/json' }
            });
            const data = await res.json();
            if (data.success && data.redirect) {
                window.location.href = data.redirect;
                return;
            }
            showToast(data.message || 'Nie udało się otworzyć korekty', 'error');
        } catch (err) {
            showToast('Błąd połączenia z serwerem', 'error');
        } finally {
            btn.disabled = false;
        }
    });
});

document.querySelectorAll('.cancel-correction-btn').forEach((btn) => {
    btn.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const orderId = btn.dataset.orderId;
        const confirmed = await confirmPrompt({
            title: 'Anuluj korektę',
            message: 'Anulować korektę dla tego zamówienia? Status wróci do „wysłane" bez wysyłki nowych danych do klienta.',
            confirmLabel: 'Anuluj korektę',
            cancelLabel: 'Wróć',
            confirmClass: 'btn btn-danger'
        });
        if (!confirmed) return;

        btn.disabled = true;
        try {
            const res = await fetch(`/admin/order-corrections/${orderId}/cancel`, {
                method: 'POST',
                headers: { 'Accept': 'application/json' }
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Nie udało się anulować korekty');
            }
            showToast(data.message || 'Korekta anulowana', 'success');
            setTimeout(() => window.location.reload(), 600);
        } catch (err) {
            showToast(err.message || 'Błąd połączenia z serwerem', 'error');
            btn.disabled = false;
        }
    });
});
