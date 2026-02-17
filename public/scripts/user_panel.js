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

            
            const row = document.querySelector(`tr[data-employee-id="${employeeToDelete}"]`);
            if (row) {
                row.remove();
            }

            
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
