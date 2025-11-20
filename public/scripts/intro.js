// Funkcja do definiowania kroków dla różnych stron
function getStepsForPage(pathname) {
    const stepsConfig = {
        '/': [ // Strona główna
            {
                intro: "Witamy w aplikacji eForm! Przejdziemy szybką wycieczkę, żeby pomóc Ci zacząć.",
                position: 'floating',
                tooltipClass: 'introjs-center-tooltip'
            },
            {
                element: '#new-order-nav-btn',
                intro: "Kliknij tutaj, aby utworzyć nowe zamówienie. Tu zaczniesz budować swoje formularze.",
                position: 'bottom-right-aligned'
            },
            {
                element: '#orders-nav-btn',
                intro: "Wyświetl wszystkie swoje istniejące zamówienia. Możesz je edytować, duplikować lub przeglądać poprzednie zgłoszenia.",
                position: 'bottom-right-aligned'
            },
            {
                element: '#orders-history-nav-btn',
                intro: "Sprawdź historię swoich zamówień i śledź poprzednie zgłoszenia.",
                position: 'bottom-right-aligned'
            },
            {
                element: '#new-order-nav-btn',
                intro: "Przejdziemy teraz do widoku nowego zamówienia.",
                position: 'floating',
                tooltipClass: 'introjs-left-tooltip'
            }
        ],
        '/orders/add-order': [ // Strona dodawania zamówienia
            {
                intro: "Utwórz tutaj nowe zamówienie. Wypełnij wszystkie wymagane pola.",
                position: 'floating',
                tooltipClass: 'introjs-center-tooltip'
            },
            {
                element: '.mobile-rm-card',
                intro: "To jest formularz zamówienia. Wypełnij wszystkie sekcje, aby utworzyć zamówienie.",
                position: 'bottom',
                tooltipClass: 'introjs-under-tooltip'
            }
        ],
        '/orders': [ // Strona zamówień
            {
                intro: "To jest Twoja strona zamówień. Tutaj możesz zarządzać wszystkimi swoimi zamówieniami.",
                position: 'floating',
                tooltipClass: 'introjs-center-tooltip'
            },
            {
                element: '.orders-container',
                intro: "Tutaj wyświetlane są wszystkie Twoje zamówienia.",
                position: 'top'
            }
        ],

        '/orders/history': [ // Strona historii zamówień
            {
                intro: "Wyświetl tutaj pełną historię swoich zamówień.",
                position: 'floating',
                tooltipClass: 'introjs-center-tooltip'
            }
        ]
    };

    // Sprawdź czy to strona szczegółów zamówienia (orders/order/NUMER)
    const orderDetailPattern = /^\/orders\/order\/\d+$/;
    if (orderDetailPattern.test(pathname)) {
        return [
            {
                intro: "To jest strona szczegółów zamówienia. Tutaj możesz przeglądać i edytować swoje konkretne zamówienie.",
                position: 'floating',
                tooltipClass: 'introjs-center-tooltip'
            },
            {
                element: '.order-header',
                intro: "Ta sekcja pokazuje informacje o zamówieniu i jego status.",
                position: 'bottom'
            },
            {
                element: '.order-content',
                intro: "Tutaj możesz zobaczyć wszystkie szczegóły zamówienia i pozycje.",
                position: 'top'
            },
            {
                element: '.order-actions',
                intro: "Użyj tych przycisków, aby edytować, duplikować lub wykonać inne akcje na tym zamówieniu.",
                position: 'top'
            }
        ];
    }

    // Sprawdź czy to strona szczegółów pozycji (position/NUMER)
    const positionDetailPattern = /^\/position\/\d+$/;
    if (positionDetailPattern.test(pathname)) {
        return [
            {
                intro: "To jest strona szczegółów pozycji. Tutaj możesz zobaczyć wszystkie informacje o tej konkretnej pozycji zamówienia.",
                position: 'floating',
                tooltipClass: 'introjs-center-tooltip'
            },
            {
                element: '.position-header, .order-item-header',
                intro: "To pokazuje nazwę pozycji i podstawowe informacje.",
                position: 'bottom'
            },
            {
                element: '.position-details, .item-details',
                intro: "Tutaj możesz zobaczyć wszystkie parametry techniczne i specyfikacje dla tej pozycji.",
                position: 'top'
            },
            {
                element: '.position-price, .price-info',
                intro: "Ta sekcja wyświetla informacje cenowe dla pozycji.",
                position: 'top'
            },
            {
                element: '.position-actions, .item-actions',
                intro: "Użyj tych przycisków, aby edytować, duplikować lub wrócić do zamówienia.",
                position: 'top'
            }
        ];
    }

    // Sprawdź czy to strona tworzenia nowej pozycji (orders/order/NUMER/new-position/)
    const newPositionPattern = /^\/orders\/order\/\d+\/new-position\/?$/;
    if (newPositionPattern.test(pathname)) {
        return [
            {
                intro: "Witamy na stronie tworzenia nowej pozycji! Tutaj możesz dodać nową pozycję do swojego zamówienia.",
                position: 'floating',
                tooltipClass: 'introjs-center-tooltip'
            },
            {
                element: '.form-container, #dynamic-form',
                intro: "To jest główny formularz, w którym skonfigurujesz swoją nową pozycję ze wszystkimi wymaganymi parametrami.",
                position: 'top'
            },
            {
                element: '.product-selection, .department-selection',
                intro: "Zacznij od wyboru kategorii produktu lub działu dla swojej nowej pozycji.",
                position: 'bottom'
            },
            {
                element: '.parameters-section, .form-fields',
                intro: "Wypełnij tutaj wszystkie parametry techniczne i specyfikacje dla swojej pozycji.",
                position: 'top'
            },
            {
                element: '.save-button, #show-button',
                intro: "Po wypełnieniu wszystkich wymaganych pól, kliknij tutaj, aby zapisać nową pozycję do zamówienia.",
                position: 'top'
            }
        ];
    }

    // Sprawdź czy to strona edycji pozycji (position/NUMER/edit)
    const editPositionPattern = /^\/position\/\d+\/edit$/;
    if (editPositionPattern.test(pathname)) {
        return [
            {
                intro: "Witamy na stronie edycji pozycji! Tutaj możesz modyfikować istniejącą pozycję zamówienia.",
                position: 'floating',
                tooltipClass: 'introjs-center-tooltip'
            },
            {
                element: '.form-container, #dynamic-form',
                intro: "Ten formularz jest wstępnie wypełniony aktualnymi danymi pozycji. Możesz modyfikować dowolne parametry.",
                position: 'top'
            },
            {
                element: '.parameters-section, .form-fields',
                intro: "Przejrzyj i zaktualizuj parametry techniczne i specyfikacje według potrzeb.",
                position: 'top'
            },
            {
                element: '#reset-button, .reset-btn',
                intro: "Użyj tego przycisku, aby zresetować wszystkie pola do ich oryginalnych wartości, jeśli chcesz zacząć od nowa.",
                position: 'bottom'
            },
            {
                element: '.save-button, #show-button',
                intro: "Kliknij tutaj, aby zapisać zmiany w pozycji. Aktualizacje zostaną zastosowane do Twojego zamówienia.",
                position: 'top'
            }
        ];
    }

    // Zwróć kroki dla danej strony lub puste jeśli nie znaleziono
    return stepsConfig[pathname] || [];
}

// Główna funkcja intro tour
function startIntroTour(pathname = window.location.pathname) {
    const steps = getStepsForPage(pathname);

    if (steps.length === 0) {
        console.log('No intro steps defined for this page:', pathname);
        return;
    }

    let intro = introJs.tour();
    intro.setOptions({
        showProgress: true,
        showBullets: false,
        exitOnOverlayClick: false,
        exitOnEsc: true,
        nextLabel: 'Next →',
        prevLabel: '← Back',
        skipLabel: 'Skip',
        doneLabel: 'Done!',
        scrollToElement: true,
        tooltipPosition: 'auto',
        steps: steps
    });

    intro.start();

    // localStorage do przechowywania kroków między stronami
    const storageKey = `introStep_${pathname.replace(/\//g, '_')}`;
    let stepCounter = parseInt(localStorage.getItem(storageKey)) || 0;
    let listenersAdded = false;

    // Funkcja zapisująca krok do localStorage
    function saveStep() {
        localStorage.setItem(storageKey, stepCounter.toString());
    }

    // Funkcja do dodawania event listenerów na przyciski
    function addButtonListeners() {
        if (listenersAdded) return;

        setTimeout(() => {
            const nextBtn = document.querySelector('.introjs-nextbutton');
            const backBtn = document.querySelector('.introjs-prevbutton');

            if (nextBtn && !nextBtn.hasAttribute('data-listener-added')) {
                nextBtn.addEventListener('click', function () {
                    stepCounter++;
                    saveStep();
                    console.log("NEXT - Krok:", stepCounter);

                    // Logika przejścia między stronami
                    if (pathname === '/' && stepCounter === 4) {
                        window.location.href = "/orders";
                    }
                });
                nextBtn.setAttribute('data-listener-added', 'true');
            }

            if (backBtn && !backBtn.hasAttribute('data-listener-added')) {
                backBtn.addEventListener('click', function () {
                    stepCounter--;
                    saveStep();
                    console.log("BACK - Krok:", stepCounter);
                });
                backBtn.setAttribute('data-listener-added', 'true');
            }

            listenersAdded = true;
        }, 100);
    }

    // Funkcja do logowania aktualnego kroku
    function logCurrentStep(targetElement) {
        const navsIds = ['new-order-nav-btn', 'orders-nav-btn', 'orders-history-nav-btn'];
        const desktopNav = document.querySelector('.desktop-nav');
        const currentStepId = targetElement ? targetElement.id : 'floating';

        listenersAdded = false;
        addButtonListeners();

        if (navsIds.includes(currentStepId)) {
            desktopNav.style.zIndex = '199';
        } else {
            desktopNav.style.zIndex = '100';
        }

        console.log("Current step:", stepCounter);
    }

    intro.onafterchange(function (targetElement) {
        logCurrentStep(targetElement);
    });

    addButtonListeners();
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(() => {
        startIntroTour();
    }, 1000);
});