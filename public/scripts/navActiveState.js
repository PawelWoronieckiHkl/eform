// Set active navigation state based on current URL
(function () {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.desktop-nav .custom-nav-link');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');

        // Skip links without proper href (like employee panel with href="#")
        if (!href || href === '#') {
            // Check if this is employee panel by ID
            if (link.id === 'employee-panel-nav-btn' && currentPath === '/user/employee-panel') {
                link.classList.add('active');
            }
            return;
        }

        let isActive = false;

        // Special case: order detail pages -> activate "Orders"
        if (currentPath.match(/^\/orders\/order\/\d+/)) {
            isActive = link.id === 'orders-nav-btn';
        }
        // Special case: add-order page -> activate "New Order"
        else if (currentPath === '/orders/add-order') {
            isActive = link.id === 'new-order-nav-btn';
        }
        // Special case: history page -> activate "History"
        else if (currentPath === '/orders/history') {
            isActive = link.id === 'orders-history-nav-btn';
        }
        // Exact match for /orders (avoid matching /orders/history)
        else if (href === '/orders' && currentPath === '/orders') {
            isActive = true;
        }
        // Exact match for other pages
        else if (href === currentPath) {
            isActive = true;
        }

        if (isActive) {
            link.classList.add('active');
        }
    });
})();
