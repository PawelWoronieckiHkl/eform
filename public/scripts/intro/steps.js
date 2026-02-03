export function getDivToChangeIndex(pathname) {
    const divToChangeMapping = {
        '/': {
            container: document.querySelector('.desktop-nav'),
            elements: ['new-order-nav-btn', 'orders-nav-btn', 'orders-history-nav-btn', 'employee-panel-nav-btn']

        },
        '/orders/add-order': {
            container: document.getElementById('new-order-card'),
            elements: ['commission-input', 'new-order-card', 'address-checkbox-container', 'send-address-checkbox-container', 'name', 'email', 'phone', 'street', 'city']
        },
        '/orders': {
            container: document.querySelector('.order-row'),
            elements: ['order-row', 'delete-order-btn', 'edit-order-btn', 'send-order']
        },
        '/orders/history': {
            container: document.querySelector('.order-row'),
            elements: ['container', 'order-row', 'copy-order-btn']
        },
        '/user/employee-panel': {

        }
    };

    // Sprawdź czy to pasuje do wzorca /orders/order/NUMER
    const orderDetailPattern = /^\/orders\/order\/\d+$/;
    if (orderDetailPattern.test(pathname)) {
        return {
            container: document.getElementById('order-nav'),
            elements: ['order-nav', 'new-order-button', 'edit-order-button', 'short-print-button', 'print-button', 'generate-excel-btn']
        };
    }

    return divToChangeMapping[pathname] || { container: null, elements: [] };
}
export function getRedirectionAfterIntro(pathname) {
    const redirectionMapping = {
        '/': '/orders/add-order',
        '/orders/add-order': false,
        '/orders': '/orders/history',
    };

    if (redirectionMapping.hasOwnProperty(pathname) && redirectionMapping[pathname]) {
        window.location.href = redirectionMapping[pathname];
    }
}
export function getStepsForPage(pathname) {
    const stepsConfig = {
        '/': [ // Strona główna
            {
                intro: "Witamy w aplikacji eForm! Przejdziemy szybką wycieczkę, żeby pomóc Ci zacząć.",
                position: 'floating',
                tooltipClass: 'introjs-center-tooltip'
            },
            {
                element: '#new-order-nav-btn',
                intro: t('order.cancel'),
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
                element: '#employee-panel-nav-btn',
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
        '/orders/add-order': [
            {
                intro: "Utwórz tutaj nowe zamówienie. Wypełnij wszystkie wymagane pola.",
                position: 'floating',
                tooltipClass: 'introjs-center-tooltip'
            },
            {
                element: '#new-order-card',
                intro: "To jest formularz zamówienia. Wypełnij wszystkie sekcje, aby utworzyć zamówienie.",
                position: 'bottom',
                tooltipClass: 'introjs-under-tooltip'
            },
            {
                element: '#commission-input',
                intro: "Tutaj wpisujemy nazwę zlecenia lub numer referencyjny dla zamówienia.",
                position: 'bottom',
                tooltipClass: 'introjs-under-tooltip'
            },
            {
                element: '#address-checkbox-container',
                intro: "Tą opcję zaznacz, jeżeli zamówienie jest dla klienta zewnętrznego",
                position: 'bottom',
                tooltipClass: 'introjs-under-tooltip'
            },
            {
                element: '#send-address-checkbox-container',
                intro: "Ta opcja potrzebna jest, jeżeli zamówienie ma być wyłane do klienta.",
                position: 'bottom',
                tooltipClass: 'introjs-under-tooltip'
            },
            {
                intro: "Uzupełnij teraz niezbędne pola. Po kliknięciu 'utwórz zamówienie przejdziemy dalej",
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
                element: '.container',
                intro: "Tutaj wyświetlane są wszystkie Twoje zamówienia.",
                position: 'top'
            }
            , {
                element: '.order-row',
                intro: "Tutaj wyświetlane są wszystkie Twoje zamówienia.",
                position: 'introjs-center-tooltip'
            }, {
                element: '#delete-order-btn',
                intro: "Tutaj wyświetlane są wszystkie Twoje zamówienia.",
                position: 'bottom-right-aligned'
            },
            {
                element: '#edit-order-btn',
                intro: "Tutaj wyświetlane są wszystkie Twoje zamówienia.",
                position: 'bottom-right-aligned'
            },
            {
                element: '#send-order',
                intro: "",
                position: 'bottom-right-aligned'
            },
            {
                element: '#orders-history-nav-btn',
                intro: "Teraz przejdziemy do historii zamówień.",
                position: 'bottom-right-aligned'
            }
        ],

        '/orders/history': [ // Strona historii zamówień
            {
                intro: "Wyświetl tutaj pełną historię swoich zamówień.",
                position: 'floating',
                tooltipClass: 'introjs-center-tooltip'
            },
                        {                
                element: '.container',
                intro: "Widok wysłanych zamówień podobny jest do naszych ofert. Różnica polega na tym, że nie możemy ich edytować ani usuwać.",
                position: 'bottom-right-aligned'
            },
            {                
                element: '.order-row',
                intro: "W konkretnym zamówieniu możemy zobaczyć szczegóły takie jak data utworzenia zamówiania, czy data złożenia zamówienia przez klienta.",
                position: 'bottom-right-aligned'
            },
                        {                
                element: '.copy-order-btn',
                intro: "Tu mamy pozy",
                position: 'bottom-right-aligned'
            },
        ],
        '/user/employee-panel': [ // Strona panelu pracownika
            {
                intro: "Witamy w panelu pracownika! Tutaj możesz zarządzać swoimi zadaniami i zamówieniami.",
                position: 'floating',
                tooltipClass: 'introjs-center-tooltip'
            },
            {
                element: '.employee-panel-container',
                intro: "To jest główny obszar panelu pracownika, gdzie możesz przeglądać i zarządzać swoimi zadaniami.",
                position: 'top'
            },
            {
                element: '#employee-orders-nav-btn',
                intro: "Kliknij tutaj, aby zobaczyć zamówienia przypisane do Ciebie.",
                position: 'bottom-right-aligned'
            },
            {
                element: '#employee-tasks-nav-btn',
                intro: "Kliknij tutaj, aby zobaczyć zadania przypisane do Ciebie.",
                position: 'bottom-right-aligned'
            }
        ]
    };

    const orderDetailPattern = /^\/orders\/order\/\d+$/;
    if (orderDetailPattern.test(pathname)) {
        const isAnyPostion = document.querySelector('.order-table') !== null || undefined;
        if (isAnyPostion) {
            return [
                {
                    intro: "To jest strona szczegółów zamówienia. Tutaj możesz przeglądać i edytować swoje konkretne zamówienie.",
                    position: 'floating',
                    tooltipClass: 'introjs-center-tooltip'
                },
                {
                    element: '#order-nav',
                    intro: "Ta sekcja służy do obsługi zamówienia.",
                    position: 'bottom-right-aligned'
                },
                {
                    element: '#new-order-button',
                    intro: "Możesz dodawać tu nowe pozycje do zamówienia.",
                    position: 'introjs-under-tooltip'
                },
                {
                    element: '#edit-order-button',
                    intro: "Edytować dane zamówienia.",
                    position: 'introjs-under-tooltip'
                },
                {
                    element: '#short-print-button',
                    intro: "Pobrać zamówienie w formie pdf",
                    position: 'bottom-right-aligned'
                },
                {
                    element: '#generate-excel-btn',
                    intro: "A także jako xlsx.",
                    position: 'top'
                }
            ];
        } else {
            return [
                {
                    intro: "To jest strona szczegółów zamówienia. Tutaj możesz przeglądać i edytować swoje konkretne zamówienie.",
                    position: 'floating',
                    tooltipClass: 'introjs-center-tooltip'
                },
                {
                    element: '#order-nav',
                    intro: "Ta sekcja służy do obsługi zamówienia.",
                    position: 'bottom-right-aligned'
                },
                {
                    element: '#new-order-button',
                    intro: "Możesz dodawać tu nowe pozycje do zamówienia.",
                    position: 'bottom-right-aligned'
                },
                {
                    element: '#edit-order-button',
                    intro: "Edytować dane zamówienia.",
                    position: 'bottom-right-aligned'
                },
                {
                    element: '#print-button',
                    intro: "Pobrać zamówienie w formie pdf",
                    position: 'bottom-right-aligned'
                },
                {
                    element: '#generate-excel-btn',
                    intro: "A także jako xlsx.",
                    position: 'bottom-right-aligned'
                }
            ];
        }
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


export function createOverlayDiv() {
    let overlayDiv = document.getElementById('intro-overlay-div');
    if (!overlayDiv) {
        overlayDiv = document.createElement('div');
        overlayDiv.id = 'intro-overlay-div';
        overlayDiv.style.position = 'fixed';
        overlayDiv.style.top = '0';
        overlayDiv.style.left = '0';
        overlayDiv.style.width = '100%';
        overlayDiv.style.height = '100%';
        overlayDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlayDiv.style.zIndex = '198';

        document.body.appendChild(overlayDiv);
    }
    return overlayDiv;
}