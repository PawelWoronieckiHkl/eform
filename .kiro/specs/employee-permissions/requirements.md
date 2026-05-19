# Requirements Document

## Introduction

Funkcjonalność uprawnień pracowników rozszerza istniejący panel pracowników (employee-panel) o system kontroli dostępu. Właściciel konta (użytkownik nadrzędny) będzie mógł przypisywać pracownikom trzy rodzaje uprawnień, które kontrolują dostęp do wysyłania zamówień, widoczność cen oraz zakres widocznych zamówień. Uprawnienia będą widoczne i zarządzane z poziomu panelu pracowników.

## Glossary

- **System_Uprawnień**: Moduł odpowiedzialny za przechowywanie, odczyt i egzekwowanie uprawnień pracowników
- **Panel_Pracowników**: Istniejący widok zarządzania pracownikami dostępny pod `/user/employee-panel`
- **Właściciel**: Użytkownik nadrzędny (owner), który zarządza pracownikami i ich uprawnieniami
- **Pracownik**: Użytkownik podrzędny utworzony przez Właściciela, logujący się do systemu z ograniczonym dostępem
- **Uprawnienie_Wysyłania_Zamówień**: Uprawnienie kontrolujące możliwość wysyłania/składania zamówień przez Pracownika
- **Uprawnienie_Widoczności_Cen**: Uprawnienie kontrolujące widoczność cen produktów dla Pracownika
- **Uprawnienie_Widoczności_Wszystkich_Zamówień**: Uprawnienie kontrolujące zakres widocznych zamówień — bez uprawnienia Pracownik widzi tylko swoje zamówienia, z uprawnieniem widzi wszystkie zamówienia klienta

## Requirements

### Wymaganie 1: Przechowywanie uprawnień pracownika

**User Story:** Jako Właściciel, chcę aby system przechowywał uprawnienia dla każdego pracownika, abym mógł kontrolować ich dostęp do funkcjonalności.

#### Kryteria Akceptacji

1. THE System_Uprawnień SHALL przechowywać dla każdego Pracownika trzy niezależne uprawnienia: Uprawnienie_Wysyłania_Zamówień, Uprawnienie_Widoczności_Cen oraz Uprawnienie_Widoczności_Wszystkich_Zamówień, gdzie każde uprawnienie przyjmuje dokładnie jedną z dwóch wartości: włączone albo wyłączone, a zmiana jednego uprawnienia nie wpływa na stan pozostałych
2. WHEN Pracownik zostanie utworzony, THE System_Uprawnień SHALL w ramach tej samej operacji ustawić wszystkie trzy uprawnienia nowego Pracownika na wartość wyłączoną
3. WHEN Pracownik zostanie usunięty, THE System_Uprawnień SHALL w ramach tej samej operacji usunąć wszystkie powiązane z nim uprawnienia przed potwierdzeniem usunięcia Pracownika
4. IF inicjalizacja uprawnień nie powiedzie się podczas tworzenia Pracownika, THEN THE System_Uprawnień SHALL wycofać całą operację tworzenia Pracownika i zwrócić komunikat o błędzie wskazujący na niepowodzenie operacji

### Wymaganie 2: Zarządzanie uprawnieniami z panelu pracowników

**User Story:** Jako Właściciel, chcę zarządzać uprawnieniami pracowników z poziomu panelu pracowników, abym mógł łatwo przyznawać i odbierać dostęp.

#### Kryteria Akceptacji

1. WHEN Właściciel otwiera Panel_Pracowników, THE System_Uprawnień SHALL wyświetlać aktualne wartości (włączone/wyłączone) trzech uprawnień każdego Pracownika jako kolumny w tabeli pracowników
2. WHEN Właściciel edytuje Pracownika, THE System_Uprawnień SHALL wyświetlać formularz z przełącznikami dla każdego z trzech uprawnień, ustawionymi na aktualny stan uprawnień danego Pracownika
3. WHEN Właściciel zmienia stan uprawnienia i zapisuje formularz, THE System_Uprawnień SHALL zaktualizować uprawnienie Pracownika w bazie danych i wyświetlić komunikat potwierdzający pomyślny zapis
4. IF zapis uprawnień nie powiedzie się z powodu błędu serwera lub bazy danych, THEN THE System_Uprawnień SHALL wyświetlić komunikat informujący o niepowodzeniu zapisu i zachować poprzedni stan uprawnień bez zmian
5. WHEN Właściciel dodaje nowego Pracownika, THE System_Uprawnień SHALL wyświetlać w formularzu tworzenia przełączniki dla każdego z trzech uprawnień z domyślnym stanem wyłączonym

### Wymaganie 3: Egzekwowanie uprawnienia wysyłania zamówień

**User Story:** Jako Właściciel, chcę kontrolować, którzy pracownicy mogą wysyłać zamówienia, abym mógł ograniczyć tę czynność do wybranych osób.

#### Kryteria Akceptacji

1. WHILE Pracownik posiada włączone Uprawnienie_Wysyłania_Zamówień, THE System_Uprawnień SHALL zezwalać Pracownikowi na wysyłanie zamówień poprzez udostępnienie aktywnego przycisku wysyłania zamówienia w interfejsie użytkownika oraz akceptowanie żądań wysyłki przez API
2. WHILE Pracownik posiada wyłączone Uprawnienie_Wysyłania_Zamówień, THE System_Uprawnień SHALL blokować możliwość wysłania zamówienia przez Pracownika zarówno w interfejsie użytkownika, jak i przez API, bez usuwania wprowadzonych danych zamówienia
3. WHILE Pracownik posiada wyłączone Uprawnienie_Wysyłania_Zamówień, THE System_Uprawnień SHALL dezaktywować przycisk wysyłania zamówienia w interfejsie użytkownika, wyświetlając go w stanie nieaktywnym (disabled)
4. IF Pracownik bez Uprawnienia_Wysyłania_Zamówień próbuje wysłać zamówienie przez API, THEN THE System_Uprawnień SHALL odrzucić żądanie, zwrócić odpowiedź z kodem błędu 403 i komunikatem wskazującym na brak uprawnień do wysyłania zamówień, bez modyfikacji stanu zamówienia
5. WHEN Właściciel zmienia stan Uprawnienia_Wysyłania_Zamówień dla Pracownika, THE System_Uprawnień SHALL zastosować nowy stan uprawnienia przy następnym żądaniu Pracownika bez konieczności ponownego logowania
6. WHEN Właściciel tworzy nowe konto Pracownika, THE System_Uprawnień SHALL ustawić Uprawnienie_Wysyłania_Zamówień jako wyłączone domyślnie

### Wymaganie 4: Egzekwowanie uprawnienia widoczności cen

**User Story:** Jako Właściciel, chcę kontrolować, którzy pracownicy widzą ceny produktów, abym mógł ukryć informacje cenowe przed wybranymi osobami.

#### Kryteria Akceptacji

1. WHILE Pracownik posiada włączone Uprawnienie_Widoczności_Cen, THE System_Uprawnień SHALL wyświetlać ceny jednostkowe produktów oraz wartości sumaryczne zamówień w interfejsie Pracownika
2. WHILE Pracownik posiada wyłączone Uprawnienie_Widoczności_Cen, THE System_Uprawnień SHALL ukrywać ceny jednostkowe produktów oraz wartości sumaryczne zamówień we wszystkich widokach interfejsu Pracownika, zastępując je pustym polem
3. WHILE Pracownik posiada wyłączone Uprawnienie_Widoczności_Cen, THE System_Uprawnień SHALL ukrywać wartości cenowe w szczegółach zamówień oraz w generowanych dokumentach PDF widocznych dla Pracownika
4. IF Pracownik bez Uprawnienia_Widoczności_Cen próbuje uzyskać dostęp do danych cenowych przez API, THEN THE System_Uprawnień SHALL zwrócić odpowiedź bez wartości cenowych, pomijając pola cenowe w zwracanych danych
5. WHEN Właściciel zmienia stan Uprawnienia_Widoczności_Cen dla Pracownika, THE System_Uprawnień SHALL egzekwować nowy stan uprawnienia od następnego żądania Pracownika bez konieczności ponownego logowania

### Wymaganie 5: Egzekwowanie uprawnienia widoczności wszystkich zamówień

**User Story:** Jako Właściciel, chcę kontrolować zakres widocznych zamówień dla pracowników, abym mógł zdecydować kto widzi wszystkie zamówienia klienta.

#### Kryteria Akceptacji

1. WHILE Pracownik posiada wyłączone Uprawnienie_Widoczności_Wszystkich_Zamówień, THE System_Uprawnień SHALL wyświetlać Pracownikowi wyłącznie zamówienia przypisane do tego Pracownika (pole employee_id) zarówno na liście zamówień aktywnych, jak i w historii zamówień wysłanych
2. WHILE Pracownik posiada włączone Uprawnienie_Widoczności_Wszystkich_Zamówień, THE System_Uprawnień SHALL wyświetlać Pracownikowi wszystkie zamówienia powiązane z kontem Właściciela (user_id) zarówno na liście zamówień aktywnych, jak i w historii zamówień wysłanych
3. WHEN Pracownik przegląda listę zamówień lub wyszukuje zamówienia, THE System_Uprawnień SHALL filtrować wyniki zgodnie z aktualnym stanem Uprawnienia_Widoczności_Wszystkich_Zamówień odczytanym z bazy danych w momencie żądania
4. IF Pracownik bez Uprawnienia_Widoczności_Wszystkich_Zamówień próbuje uzyskać dostęp do szczegółów zamówienia, które nie jest do niego przypisane, THEN THE System_Uprawnień SHALL zwrócić odpowiedź z kodem błędu 403 i komunikatem o braku uprawnień

### Wymaganie 6: Bezpieczeństwo i autoryzacja

**User Story:** Jako Właściciel, chcę mieć pewność, że tylko ja mogę zarządzać uprawnieniami moich pracowników, aby nikt nieupoważniony nie mógł zmieniać dostępów.

#### Kryteria Akceptacji

1. THE System_Uprawnień SHALL zezwalać na modyfikację uprawnień Pracownika (włączanie i wyłączanie Uprawnienie_Wysyłania_Zamówień, Uprawnienie_Widoczności_Cen, Uprawnienie_Widoczności_Wszystkich_Zamówień) wyłącznie Właścicielowi, który utworzył danego Pracownika
2. IF użytkownik inny niż Właściciel-twórca danego Pracownika (w tym inny Właściciel, inny Pracownik lub niezalogowany użytkownik) próbuje zmienić uprawnienia Pracownika, THEN THE System_Uprawnień SHALL zwrócić odpowiedź z kodem błędu 403 i komunikatem wskazującym brak uprawnień do tej operacji, bez modyfikowania stanu uprawnień Pracownika
3. WHEN Pracownik loguje się do systemu, THE System_Uprawnień SHALL załadować wartości trzech uprawnień Pracownika z bazy danych do sesji przed przekierowaniem do strony głównej
4. THE System_Uprawnień SHALL weryfikować uprawnienia Pracownika po stronie serwera przy każdym żądaniu do endpointów wysyłania zamówień, wyświetlania cen oraz pobierania listy zamówień, odczytując uprawnienia z sesji Pracownika
5. WHEN Właściciel zmienia uprawnienia Pracownika, który posiada aktywną sesję, THEN THE System_Uprawnień SHALL zastosować zmienione uprawnienia najpóźniej przy następnym żądaniu Pracownika wymagającym weryfikacji uprawnień
