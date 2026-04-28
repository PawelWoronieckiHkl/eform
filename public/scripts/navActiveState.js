
(function () {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.desktop-nav .custom-nav-link');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');

        
        if (!href || href === '#') {
            
            if (link.id === 'employee-panel-nav-btn' && currentPath === '/user/employee-panel') {
                link.classList.add('active');
            }
            return;
        }

        let isActive = false;

        
        if (currentPath.match(/^\/orders\/order\/\d+/)) {
            isActive = link.id === 'orders-nav-btn';
        }
        
        else if (currentPath === '/orders/add-order') {
            isActive = link.id === 'new-order-nav-btn';
        }
        
        else if (currentPath === '/orders/history') {
            isActive = link.id === 'orders-history-nav-btn';
        }

        else if (currentPath.startsWith('/orders/history/order/')) {
            isActive = link.id === 'orders-history-nav-btn';
        }

        else if (currentPath.startsWith('/orders/edit/')) {
            isActive = link.id === 'new-order-nav-btn';
        }

        else if (currentPath === '/orders/organization-orders') {
            const historyParam = new URLSearchParams(window.location.search).get('history');
            isActive = historyParam === 'true'
                ? link.id === 'orders-history-nav-btn'
                : link.id === 'orders-nav-btn';
        }

        else if (href === '/orders' && currentPath === '/orders') {
            isActive = true;
        }
        
        else if (href === currentPath) {
            isActive = true;
        }

        if (isActive) {
            link.classList.add('active');
        }
    });
})();
