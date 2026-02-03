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
                position: 'top'
            },
            {
                element: '#edit-order-btn',
                intro: "Tutaj wyświetlane są wszystkie Twoje zamówienia.",
                position: 'top'
            },
            {
                element: '#send-order',
                intro: "Tutaj wyświetlane są wszystkie Twoje zamówienia.",
                position: 'top'
            },
            {
                element: '.order-row',
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

    // Sprawdź czy to strona szczegółów zamówienia (orders/order/NUMER)
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
        ];} else {
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
                    intro: "To zamówienie nie ma jeszcze żadnych pozycji. Kliknij przycisk poniżej, aby dodać nową pozycję do tego zamówienia.",
                    position: 'top'
                },
                {
                    element: '.order-actions',
                    intro: "Użyj tych przycisków, aby edytować, duplikować lub wykonać inne akcje na tym zamówieniu.",
                    position: 'top'
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

// Główna funkcja intro tour
