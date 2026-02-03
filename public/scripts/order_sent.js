const deliverystatusBtns = document.querySelectorAll('.status-btn');

deliverystatusBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const orderPosId = btn.getAttribute('data-id');
        const statusRow = document.getElementById(`status-row-${orderPosId}`);
        if (statusRow) {
            statusRow.classList.toggle('d-none');

        }
    });
});