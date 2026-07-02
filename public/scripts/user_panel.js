import { showToast } from "./components/toast.js";

const deleteDialog = document.getElementById('delete-dialog');
const cancelBtn = document.getElementById('cancel-btn');
const confirmBtn = document.getElementById('confirm-btn');
const dialogMessage = document.getElementById('dialog-message');

let employeeToDelete = null;


document.querySelectorAll('.delete-employee-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();

        const employeeId = btn.dataset.id;
        const employeeName = btn.dataset.name;

        employeeToDelete = employeeId;
        dialogMessage.textContent = `Czy na pewno chcesz usunąć pracownika ${employeeName}?`;

        deleteDialog.showModal();
    });
});


cancelBtn.addEventListener('click', () => {
    deleteDialog.close();
    employeeToDelete = null;
});


confirmBtn.addEventListener('click', async () => {
    if (!employeeToDelete) return;

    try {
        const response = await fetch(`/user/employee/${employeeToDelete}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success) {
            showToast('success', result.message || 'Pracownik został usunięty');

            document.querySelectorAll(`[data-employee-id="${employeeToDelete}"].employee-row`).forEach(el => el.remove());

            const remainingRows = document.querySelectorAll('.employee-table tbody tr');
            if (remainingRows.length === 0) {
                location.reload(); 
            }
        } else {
            showToast('error', result.message || 'Błąd podczas usuwania pracownika');
        }
    } catch (error) {
        console.error('Error deleting employee:', error);
        showToast('error', 'Błąd podczas usuwania pracownika');
    } finally {
        deleteDialog.close();
        employeeToDelete = null;
    }
});


deleteDialog.addEventListener('click', (e) => {
    if (e.target === deleteDialog) {
        deleteDialog.close();
        employeeToDelete = null;
    }
});


// Obsługa checkboxów uprawnień — natychmiastowy zapis po kliknięciu
document.querySelectorAll('.permission-toggle').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
        const employeeId = e.target.dataset.employeeId;
        const permission = e.target.dataset.permission;
        const value = e.target.checked ? '1' : '0';

        // Zbierz aktualny stan wszystkich trzech uprawnień dla tego pracownika
        const row = e.target.closest('.employee-row');
        const checkboxes = row.querySelectorAll('.permission-toggle');
        const permissions = {};
        checkboxes.forEach(cb => {
            permissions[cb.dataset.permission] = cb.checked ? '1' : '0';
        });

        // Jeśli zmieniono can_see_prices — toggle disabled na price_factor input
        if (permission === 'can_see_prices') {
            const factorInput = row.querySelector('.price-factor-input');
            if (factorInput) {
                factorInput.disabled = !e.target.checked;
            }
        }

        try {
            const response = await fetch(`/user/employee/edit/${employeeId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(permissions)
            });

            const result = await response.json();

            if (result.success) {
                showToast('success', result.message || 'Uprawnienia zapisane');
            } else {
                // Cofnij zmianę
                e.target.checked = !e.target.checked;
                showToast('error', result.message || 'Błąd zapisu uprawnień');
            }
        } catch (error) {
            // Cofnij zmianę
            e.target.checked = !e.target.checked;
            console.error('Error updating permission:', error);
            showToast('error', 'Błąd zapisu uprawnień');
        }
    });
});


// Obsługa pola faktor cen — zapis po zmianie (blur)
document.querySelectorAll('.price-factor-input').forEach(input => {
    input.addEventListener('change', async (e) => {
        const employeeId = e.target.dataset.employeeId;
        const value = parseFloat(e.target.value);

        if (isNaN(value) || value < 0.01 || value > 99.99) {
            showToast('error', 'Faktor cen musi być między 0.01 a 99.99');
            e.target.value = '1.00';
            return;
        }

        try {
            const response = await fetch(`/user/employee/${employeeId}/price-factor`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ price_factor: value })
            });

            const result = await response.json();

            if (result.success) {
                showToast('success', result.message || 'Faktor cen zapisany');
            } else {
                showToast('error', result.message || 'Błąd zapisu faktora cen');
            }
        } catch (error) {
            console.error('Error updating price factor:', error);
            showToast('error', 'Błąd zapisu faktora cen');
        }
    });
});
