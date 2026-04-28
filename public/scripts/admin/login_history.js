document.addEventListener('DOMContentLoaded', function () {
    const searchBtn = document.getElementById('searchBtn');
    const userIdentSearch = document.getElementById('userIdentSearch');
    const limitSelect = document.getElementById('limitSelect');

    if (!searchBtn) return;

    searchBtn.addEventListener('click', function () {
        performSearch();
    });

    userIdentSearch.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') performSearch();
    });

    function performSearch() {
        const userIdent = userIdentSearch.value.trim();
        const limit = limitSelect.value;

        const params = new URLSearchParams();
        if (userIdent) params.append('user_ident', userIdent);
        params.append('limit', limit);

        fetch('/admin/api/login-history?' + params.toString())
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateTable(data.data);
                } else {
                    console.error('Error:', data.message);
                    alert('Błąd podczas wyszukiwania: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Fetch error:', error);
                alert('Błąd połączenia z serwerem');
            });
    }

    function updateTable(loginHistory) {
        const tbody = document.getElementById('loginHistoryTableBody');

        if (loginHistory.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center p-4">
                        <i class="bi bi-inbox display-6 text-muted"></i><br>
                        <span class="text-muted">Brak wyników wyszukiwania</span>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = loginHistory.map(login => `
            <tr>
                <td>${login.id}</td>
                <td><span class="user-pin">${login.user_pin}</span></td>
                <td>
                    ${login.user_ident
                        ? `<span class="user-ident">${login.user_ident}</span>`
                        : '<span class="text-muted">Brak</span>'
                    }
                </td>
                <td>
                    <div class="login-time">
                        ${login.login_time_formatted || new Date(login.login_time).toLocaleString('pl-PL')}
                    </div>
                </td>
            </tr>
        `).join('');
    }
});
