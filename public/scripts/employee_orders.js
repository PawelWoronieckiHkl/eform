import { buildAndShowDialog } from './order.js';

document.addEventListener('DOMContentLoaded', () => {
    const sendOrderButtons = document.querySelectorAll('.send-order-btn');

    sendOrderButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            buildAndShowDialog(btn);
        });
    });
});

const searchInput = document.getElementById('order-search');


function filterOrders(searchTerm) {
    const filterStatusSelect = document.getElementById('filter-status');
    const selectedStatus = filterStatusSelect ? filterStatusSelect.value : '0';
    const ordersTable = document.querySelector('.orders-table tbody');
    const rows = ordersTable.querySelectorAll('tr');

    rows.forEach(row => {
        const commissionCell = row.querySelector('td:nth-child(1)');
        const commissionText = commissionCell.textContent.toLowerCase();
        const statusCell = row.querySelector('td:nth-child(3)');
        const statusText = statusCell.classList.value;

        const matchesSearch = commissionText.includes(searchTerm.toLowerCase());
        const matchesStatus = selectedStatus === '0' || statusText === selectedStatus.toLowerCase();

        if (matchesSearch && (matchesStatus || selectedStatus === 'all')) {
            row.style.display = '';
        } 
         else {
            row.style.display = 'none';
        }
    });
}

searchInput.addEventListener('input', () => {
    filterOrders(searchInput.value);
});

const filterStatusSelect = document.getElementById('filter-status');

filterStatusSelect.addEventListener('change', () => {
    const selectedStatus = filterStatusSelect.value;
    const ordersTable = document.querySelector('.orders-table tbody');
    const rows = ordersTable.querySelectorAll('tr');

    rows.forEach(row => {
        const commissionCell = row.querySelector('td:nth-child(1)');
        const commissionText = commissionCell.textContent.toLowerCase();
        const statusCell = row.querySelector('td:nth-child(3)');
        const statusText = statusCell.classList.value;
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

        const matchesSearch = commissionText.includes(searchTerm);
        const matchesStatus = selectedStatus === '0' || statusText === selectedStatus.toLowerCase();

    
        if (matchesSearch && matchesStatus) {
            row.style.display = '';
        } else if (selectedStatus === 'all') {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
});