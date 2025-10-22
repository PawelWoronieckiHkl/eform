document.addEventListener('DOMContentLoaded', function () {
    // Funkcja dla składanych kart mobilnych
    function initMobileCards() {
        const mobileCards = document.querySelectorAll('.mobile-item-card');

        mobileCards.forEach(card => {
            let clickTimeout;

            // Dodaj event listener dla kliknięcia na całą kartę
            card.addEventListener('click', function (e) {
                // Nie przełączaj jeśli kliknięto na przycisk akcji
                if (e.target.closest('.mobile-item-actions') ||
                    e.target.closest('button') ||
                    e.target.closest('a')) {
                    return;
                }

                // Clear any existing timeout
                clearTimeout(clickTimeout);

                // Set a timeout for single click
                clickTimeout = setTimeout(() => {
                    // Przełącz klasę expanded
                    this.classList.toggle('expanded');

                    // Delikatne przesunięcie animacji
                    if (this.classList.contains('expanded')) {
                        this.style.transform = 'scale(1.02)';
                        setTimeout(() => {
                            this.style.transform = 'scale(1)';
                        }, 150);
                    }
                }, 250); // Wait for potential double click
            });

            // Double click to navigate to position
            card.addEventListener('dblclick', function (e) {
                // Clear the single click timeout
                clearTimeout(clickTimeout);

                // Don't navigate if clicked on action buttons
                if (e.target.closest('.mobile-item-actions') ||
                    e.target.closest('button') ||
                    e.target.closest('a')) {
                    return;
                }

                // Navigate to position
                const positionUrl = this.getAttribute('data-position-url');
                if (positionUrl) {
                    window.location.href = positionUrl;
                }
            });

            // Dodaj hover effect tylko dla desktop
            if (window.innerWidth > 768) {
                card.addEventListener('mouseenter', function () {
                    this.style.transform = 'translateY(-2px)';
                    this.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.18)';
                });

                card.addEventListener('mouseleave', function () {
                    if (!this.classList.contains('expanded')) {
                        this.style.transform = 'translateY(0)';
                        this.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.12)';
                    }
                });
            }
        });
    }

    // Uruchom funkcję
    initMobileCards();

    // Reinicjalizuj po zmianie orientacji lub rozmiar
    window.addEventListener('resize', function () {
        // Ponowna inicjalizacja po zmianie rozmiaru
        setTimeout(initMobileCards, 100);
    });

    // Debug info
    console.log('Mobile cards initialized:', document.querySelectorAll('.mobile-item-card').length);
});