document.addEventListener('DOMContentLoaded', function () {
    const userInput = document.getElementById('userSelect');
    const userDropdown = document.getElementById('userDropdown');
    let selectedUserIdent = '';
    let allUsers = [];

    if (userInput && userDropdown) {
        
        const dropdownItems = userDropdown.querySelectorAll('.dropdown-item');
        dropdownItems.forEach(item => {
            const name = item.textContent.trim();
            const ident = item.getAttribute('data-value');

            
            if (name && name !== '' && name !== '-' && name.trim() !== '') {
                allUsers.push({
                    ident: ident,
                    name: name
                });
            }
        });

        
        allUsers.sort((a, b) => a.name.localeCompare(b.name, 'pl', { sensitivity: 'base' }));

        
        userDropdown.innerHTML = '';
        allUsers.forEach(user => {
            const dropdownItem = document.createElement('div');
            dropdownItem.className = 'dropdown-item';
            dropdownItem.setAttribute('data-value', user.ident);
            dropdownItem.textContent = user.name;
            userDropdown.appendChild(dropdownItem);
        });

        
        const sortedDropdownItems = userDropdown.querySelectorAll('.dropdown-item');

        
        userInput.addEventListener('focus', function () {
            showAllItems();
            userDropdown.classList.add('show');
        });

        userInput.addEventListener('click', function () {
            showAllItems();
            userDropdown.classList.add('show');
        });

        
        userInput.addEventListener('input', function () {
            const searchTerm = this.value.toLowerCase();
            filterItems(searchTerm);
        });


        userDropdown.addEventListener('click', function (e) {
            if (e.target.classList.contains('dropdown-item')) {
                const selectedName = e.target.textContent.trim();
                const selectedIdent = e.target.getAttribute('data-value');

                userInput.value = selectedName;
                selectedUserIdent = selectedIdent;
                userDropdown.classList.remove('show');

                const targetPath = `/orders/userOrders?userIdent=${encodeURIComponent(selectedIdent)}`;
                localStorage.setItem('lastUserPath', targetPath);

                
                getOrgIdent().then(() => {
                    window.location.href = targetPath;
                });
            }
        });

        
        document.addEventListener('click', function (e) {
            if (!userInput.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.remove('show');
            }
        });

        
        userInput.addEventListener('keydown', function (e) {
            const visibleItems = userDropdown.querySelectorAll('.dropdown-item:not(.hidden)');
            let currentIndex = -1;

            
            visibleItems.forEach((item, index) => {
                if (item.classList.contains('highlighted')) {
                    currentIndex = index;
                }
            });

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                currentIndex = currentIndex < visibleItems.length - 1 ? currentIndex + 1 : 0;
                highlightItem(visibleItems, currentIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                currentIndex = currentIndex > 0 ? currentIndex - 1 : visibleItems.length - 1;
                highlightItem(visibleItems, currentIndex);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentIndex >= 0 && visibleItems[currentIndex]) {
                    visibleItems[currentIndex].click();
                }
            } else if (e.key === 'Escape') {
                userDropdown.classList.remove('show');
            }
        });

        function showAllItems() {
            sortedDropdownItems.forEach(item => {
                item.classList.remove('hidden', 'highlighted');
            });
        }

        function filterItems(searchTerm) {
            sortedDropdownItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
                item.classList.remove('highlighted');
            });
            userDropdown.classList.add('show');
        }

        function highlightItem(visibleItems, index) {
            visibleItems.forEach(item => item.classList.remove('highlighted'));
            if (visibleItems[index]) {
                visibleItems[index].classList.add('highlighted');
                visibleItems[index].scrollIntoView({ block: 'nearest' });
            }
        }
    }

    
    const urlParams = new URLSearchParams(window.location.search);
    const selectedUserIdentFromUrl = urlParams.get('userIdent');

    if (selectedUserIdentFromUrl && userInput) {
        
        const selectedUser = allUsers.find(user => user.ident === selectedUserIdentFromUrl);
        if (selectedUser) {
            userInput.value = selectedUser.name;
            selectedUserIdent = selectedUserIdentFromUrl;
        }
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