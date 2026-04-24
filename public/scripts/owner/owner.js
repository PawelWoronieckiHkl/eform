document.addEventListener('DOMContentLoaded', function () {
    const searchMount = document.getElementById('orders-search-mount');
    if (!searchMount) return;

    const isSent = searchMount.dataset.sent === 'true';
    const isOrganization = searchMount.dataset.organization === 'true';

    function handleInlineUserSelect(selectedIdent) {
        let targetPath;
        if (isOrganization) {
            const historyParam = isSent ? '&history=true' : '';
            targetPath = `/orders/organization-orders?userIdent=${encodeURIComponent(selectedIdent)}${historyParam}`;
        } else {
            const basePath = isSent ? '/orders/history' : '/orders/userOrders';
            targetPath = `${basePath}?userIdent=${encodeURIComponent(selectedIdent)}`;
        }
        localStorage.setItem('lastUserPath', targetPath);
        getOrgIdent().then(() => { window.location.href = targetPath; });
    }

    // Init inline dropdown (orders_owner.njk) — uses global initUserDropdown from base.js
    if (typeof window.initUserDropdown !== 'function') return;
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