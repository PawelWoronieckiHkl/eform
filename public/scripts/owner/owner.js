document.addEventListener('DOMContentLoaded', function () {
    const searchMount = document.getElementById('orders-search-mount');
    const isSent = searchMount && searchMount.dataset.sent === 'true';

    function handleInlineUserSelect(selectedIdent) {
        const basePath = isSent ? '/orders/history' : '/orders/userOrders';
        const targetPath = `${basePath}?userIdent=${encodeURIComponent(selectedIdent)}`;
        localStorage.setItem('lastUserPath', targetPath);
        getOrgIdent().then(() => { window.location.href = targetPath; });
    }

    // Init inline dropdown (orders_owner.njk) — uses global initUserDropdown from base.js
    const inline = window.initUserDropdown('inlineUserSelect', 'inlineUserDropdown', handleInlineUserSelect);

    // Restore selected user from URL
    const urlParams = new URLSearchParams(window.location.search);
    const selectedUserIdentFromUrl = urlParams.get('userIdent');
    if (selectedUserIdentFromUrl && inline.input) {
        const selectedUser = inline.allUsers.find(user => user.ident === selectedUserIdentFromUrl);
        if (selectedUser) inline.input.value = selectedUser.name;
    }
});

function getOrgIdent() {
    return fetch('/get-org-ident', {
        method: 'GET',
        credentials: 'include'
    })
        .then(response => response.json())
        .then(data => {
            if (data.organization) {
                localStorage.setItem('orgIdent', `${data.organization}`);
                console.log(data.organization, 'zapisano pomyślnie');
                return data.organization;
            }
        })
        .catch(err => {
            console.error('Błąd pobierania orgIdent:', err);
        });
}