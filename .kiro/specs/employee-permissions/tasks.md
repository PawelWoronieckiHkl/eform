# Implementation Plan: Employee Permissions

## Overview

Implementacja systemu uprawnień pracowników w istniejącej aplikacji Node.js/Express. Plan obejmuje migrację bazy danych, warstwę DB, middleware autoryzacyjny, modyfikacje routingu, zmiany w widokach oraz testy property-based. Każdy krok buduje na poprzednich, kończąc integracją wszystkich komponentów.

## Tasks

- [x] 1. Migracja bazy danych i warstwa DB
  - [x] 1.1 Utworzenie skryptu migracji ALTER TABLE dla tabeli `employee`
    - Dodanie kolumn `can_send_orders TINYINT(1) NOT NULL DEFAULT 0`, `can_see_prices TINYINT(1) NOT NULL DEFAULT 0`, `can_see_all_orders TINYINT(1) NOT NULL DEFAULT 0`
    - Skrypt SQL w pliku migracji lub bezpośrednie wykonanie ALTER TABLE
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Implementacja funkcji `getEmployeePermissions` w `db/users.js`
    - Funkcja przyjmuje `employeeId`, zwraca obiekt `{ can_send_orders, can_see_prices, can_see_all_orders }`
    - Wykorzystanie istniejącego wzorca zapytań z `db/users.js`
    - _Requirements: 1.1, 6.3_

  - [x] 1.3 Implementacja funkcji `updateEmployeePermissions` w `db/users.js`
    - Funkcja przyjmuje `employeeId` i obiekt `permissions`
    - UPDATE na tabeli `employee` dla trzech kolumn uprawnień
    - _Requirements: 2.3, 2.4_

  - [x] 1.4 Implementacja funkcji `getEmployeePermissionsByLogin` w `db/users.js`
    - Funkcja przyjmuje `login`, zwraca uprawnienia pracownika
    - Używana przy logowaniu do załadowania uprawnień do sesji
    - _Requirements: 6.3_

  - [x]* 1.5 Write property test: Niezależność uprawnień
    - **Property 1: Niezależność uprawnień**
    - Generowanie losowych stanów trzech uprawnień, zmiana jednego, weryfikacja że pozostałe nie uległy zmianie
    - **Validates: Requirements 1.1**

  - [x]* 1.6 Write property test: Trwałość zapisu uprawnień
    - **Property 3: Trwałość zapisu uprawnień**
    - Generowanie wszystkich 8 kombinacji stanów, zapis i odczyt, weryfikacja identyczności
    - **Validates: Requirements 2.3**

- [x] 2. Checkpoint - Weryfikacja warstwy DB
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Middleware uprawnień pracownika
  - [x] 3.1 Utworzenie pliku `middleware/employeePermissions.js` z funkcją `loadEmployeePermissions`
    - Middleware sprawdza czy użytkownik jest pracownikiem (sesja)
    - Odczytuje uprawnienia z DB przy każdym żądaniu do chronionych endpointów
    - Zapisuje uprawnienia w `req.session.employeePermissions`
    - _Requirements: 6.4, 6.5, 3.5, 4.5_

  - [x] 3.2 Implementacja middleware `requireSendPermission`
    - Sprawdza `req.session.employeePermissions.can_send_orders`
    - Zwraca 403 z komunikatem `"Brak uprawnień do wysyłania zamówień"` gdy wyłączone
    - Przepuszcza żądanie gdy włączone lub użytkownik nie jest pracownikiem
    - _Requirements: 3.1, 3.2, 3.4_

  - [x] 3.3 Implementacja middleware `filterPriceData`
    - Sprawdza `req.session.employeePermissions.can_see_prices`
    - Ustawia flagę `req.hidePrices = true` gdy pracownik nie ma uprawnienia
    - Flaga używana w route handlerach i szablonach do ukrywania cen
    - _Requirements: 4.1, 4.2, 4.4_

  - [x] 3.4 Implementacja middleware `filterOrdersByPermission`
    - Sprawdza `req.session.employeePermissions.can_see_all_orders`
    - Ustawia `req.orderFilter` z odpowiednim filtrem (employee_id lub user_id)
    - _Requirements: 5.1, 5.2, 5.3_

  - [x]* 3.5 Write property test: Egzekwowanie uprawnienia wysyłania zamówień
    - **Property 4: Egzekwowanie uprawnienia wysyłania zamówień**
    - Losowi pracownicy z losowym stanem uprawnienia, weryfikacja odpowiedzi middleware (next vs 403)
    - **Validates: Requirements 3.1, 3.2, 3.4**

  - [x]* 3.6 Write property test: Egzekwowanie widoczności cen
    - **Property 5: Egzekwowanie widoczności cen**
    - Losowe stany uprawnienia, weryfikacja ustawienia flagi `hidePrices`
    - **Validates: Requirements 4.1, 4.2, 4.4**

  - [x]* 3.7 Write property test: Filtrowanie widoczności zamówień
    - **Property 6: Filtrowanie widoczności zamówień**
    - Losowe zbiory zamówień z różnymi employee_id, weryfikacja poprawności filtrowania
    - **Validates: Requirements 5.1, 5.2, 5.4**

- [x] 4. Checkpoint - Weryfikacja middleware
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Modyfikacje routingu backend - zarządzanie pracownikami
  - [x] 5.1 Modyfikacja `POST /user/employee/add` w `routes/users.js`
    - Dodanie obsługi pól `can_send_orders`, `can_see_prices`, `can_see_all_orders` z body żądania
    - Wartości domyślne 0 gdy nie podane
    - Zapis uprawnień w ramach INSERT pracownika
    - _Requirements: 1.2, 2.5, 3.6_

  - [x] 5.2 Modyfikacja `POST /user/employee/edit/:id` w `routes/users.js`
    - Dodanie obsługi pól uprawnień z body żądania
    - Wywołanie `updateEmployeePermissions` po walidacji
    - Weryfikacja że edytujący jest właścicielem pracownika
    - _Requirements: 2.3, 6.1, 6.2_

  - [x] 5.3 Modyfikacja `GET /user/employee/edit/:id` w `routes/users.js`
    - Pobranie aktualnych uprawnień pracownika przez `getEmployeePermissions`
    - Przekazanie uprawnień do szablonu formularza edycji
    - _Requirements: 2.2_

  - [x] 5.4 Modyfikacja `GET /user/employee-panel` w `routes/users.js`
    - Pobranie uprawnień dla każdego pracownika na liście
    - Przekazanie uprawnień do szablonu tabeli
    - _Requirements: 2.1_

  - [ ]* 5.5 Write property test: Wyłączność modyfikacji uprawnień przez właściciela
    - **Property 7: Wyłączność modyfikacji uprawnień przez właściciela**
    - Losowi użytkownicy różnych typów próbujący modyfikować uprawnienia, weryfikacja odrzucenia dla nie-właścicieli
    - **Validates: Requirements 6.1, 6.2**

- [x] 6. Modyfikacje routingu backend - egzekwowanie uprawnień
  - [x] 6.1 Podpięcie `requireSendPermission` do `POST /orders/send/:orderId`
    - Dodanie middleware przed route handlerem wysyłania zamówienia
    - _Requirements: 3.1, 3.2, 3.4_

  - [x] 6.2 Podpięcie `filterOrdersByPermission` do `GET /orders/` i `GET /orders/history`
    - Modyfikacja zapytań o zamówienia z uwzględnieniem `req.orderFilter`
    - Filtrowanie po `employee_id` lub zwrot wszystkich zamówień właściciela
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 6.3 Podpięcie `filterPriceData` do endpointów zamówień
    - Dodanie middleware do `GET /orders/order/:orderId` i list zamówień
    - Przekazanie flagi `hidePrices` do szablonów
    - _Requirements: 4.1, 4.2, 4.4_

  - [x] 6.4 Sprawdzenie dostępu do szczegółów zamówienia w `GET /orders/order/:orderId`
    - Gdy pracownik nie ma `can_see_all_orders` i zamówienie nie jest jego — zwrot 403
    - _Requirements: 5.4_

  - [x] 6.5 Modyfikacja generowania PDF — ukrywanie cen
    - Modyfikacja `services/mailBot/pdfGenerator.js` lub odpowiedniego generatora
    - Sprawdzenie uprawnienia `can_see_prices` i pominięcie kolumn cenowych w PDF
    - _Requirements: 4.3_

- [x] 7. Checkpoint - Weryfikacja backend
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Ładowanie uprawnień przy logowaniu
  - [x] 8.1 Modyfikacja procesu logowania w `services/authService.js`
    - Po pomyślnym logowaniu pracownika wywołanie `getEmployeePermissionsByLogin`
    - Zapis uprawnień do `req.session.employeePermissions` jako obiekt Boolean
    - _Requirements: 6.3_

  - [x] 8.2 Podpięcie middleware `loadEmployeePermissions` do chronionych tras
    - Dodanie middleware do routera obsługującego zamówienia i panel
    - Middleware odświeża uprawnienia z DB przy każdym żądaniu
    - _Requirements: 6.4, 6.5_

- [x] 9. Zmiany w widokach frontend
  - [x] 9.1 Modyfikacja szablonu `templates/user/user_panel.njk` — kolumny uprawnień w tabeli
    - Dodanie trzech kolumn: Wysyłanie, Ceny, Wszystkie zamówienia
    - Wyświetlanie ikon/znaczników włączone/wyłączone dla każdego pracownika
    - _Requirements: 2.1_

  - [x] 9.2 Modyfikacja szablonu `templates/user/edit_employee.njk` — przełączniki uprawnień
    - Dodanie trzech toggle switches z etykietami
    - Ustawienie stanu przełączników na aktualny stan uprawnień pracownika
    - Przesyłanie wartości w formularzu jako `can_send_orders`, `can_see_prices`, `can_see_all_orders`
    - _Requirements: 2.2_

  - [x] 9.3 Modyfikacja szablonu `templates/user/add_employee.njk` — przełączniki z domyślnym stanem
    - Dodanie trzech toggle switches z domyślnym stanem wyłączonym
    - _Requirements: 2.5_

  - [x] 9.4 Modyfikacja szablonu zamówień — warunkowe ukrywanie przycisku wysyłania
    - Sprawdzenie `employeePermissions.can_send_orders` w szablonie
    - Dezaktywacja (disabled) przycisku wysyłania gdy brak uprawnienia
    - _Requirements: 3.1, 3.3_

  - [x] 9.5 Modyfikacja szablonów zamówień — warunkowe ukrywanie cen
    - Sprawdzenie flagi `hidePrices` w szablonach list i szczegółów zamówień
    - Zastąpienie wartości cenowych pustym polem gdy brak uprawnienia
    - _Requirements: 4.2, 4.3_

- [x] 10. Checkpoint - Weryfikacja integracji frontend-backend
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Bezpieczeństwo i integracja końcowa
  - [x] 11.1 Weryfikacja autoryzacji — sprawdzenie że tylko właściciel może modyfikować uprawnienia
    - Upewnienie się że route `POST /user/employee/edit/:id` sprawdza relację właściciel-pracownik
    - Zwrot 403 dla nieautoryzowanych prób modyfikacji
    - _Requirements: 6.1, 6.2_

  - [x] 11.2 Wiring — podpięcie wszystkich middleware do odpowiednich tras w `app.js` lub routerach
    - Upewnienie się że `loadEmployeePermissions` jest wywoływany przed middleware sprawdzającymi
    - Poprawna kolejność middleware w łańcuchu Express
    - _Requirements: 6.4_

  - [ ]* 11.3 Write property test: Kaskadowe usuwanie uprawnień
    - **Property 2: Kaskadowe usuwanie uprawnień**
    - Tworzenie pracowników z losowymi uprawnieniami, usuwanie, weryfikacja braku danych
    - **Validates: Requirements 1.3**

- [x] 12. Final checkpoint - Weryfikacja końcowa
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Projekt używa Node.js/Express, MySQL/MariaDB, szablonów Nunjucks, sesji Express
- Middleware odczytuje uprawnienia z DB przy każdym żądaniu (strategia wybrana w design doc)
- Uprawnienia przechowywane jako kolumny TINYINT w istniejącej tabeli `employee`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["1.5", "1.6", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4"] },
    { "id": 4, "tasks": ["3.5", "3.6", "3.7", "8.1"] },
    { "id": 5, "tasks": ["5.1", "5.2", "5.3", "5.4"] },
    { "id": 6, "tasks": ["5.5", "6.1", "6.2", "6.3", "6.4", "6.5"] },
    { "id": 7, "tasks": ["8.2", "9.1", "9.2", "9.3"] },
    { "id": 8, "tasks": ["9.4", "9.5"] },
    { "id": 9, "tasks": ["11.1", "11.2"] },
    { "id": 10, "tasks": ["11.3"] }
  ]
}
```
