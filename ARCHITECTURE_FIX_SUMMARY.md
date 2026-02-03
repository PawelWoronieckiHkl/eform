# Architektura Rozwiązania - Problem Liczenia Cen

## Problem

**Symptom**: Przy szybkim kliknięciu przycisku zapisu po zmianie parametru, ceny nie zdążają się przeliczyć.

**Przyczyny root cause**:
1. **Asynchroniczne operacje bez kontroli** - `calculateFromScript()` używa callback, nie jest awaitable
2. **Brak kolejki zadań** - wielokrotne zmiany parametrów mogą nakładać się na siebie
3. **Brak blokady UI** - przyciski aktywne podczas obliczeń
4. **Flagi ustawiane przedwcześnie** - `isPriceCalculating=true` przed faktycznym zakończeniem async operacji

## Rozwiązanie Architektoniczne

### 1. System Kolejki Zadań (Task Queue)

```javascript
window.calculationQueue = [];  // Kolejka identyfikatorów zadań
window.isCalculating = false;  // Czy aktualnie trwa jakiekolwiek obliczenie
window.isPriceCalculating = false;  // Czy WSZYSTKIE obliczenia zakończone
```

**Mechanizm**:
- Każde wywołanie `updateProcedure()` dodaje się do kolejki
- Zadanie czeka aż będzie pierwsze w kolejce
- Po zakończeniu usuwa się z kolejki
- Gdy kolejka pusta → UI odblokowane

### 2. Proper Async/Await Chain

#### Przed:
```javascript
// calculateFromScript używał callback - nie było await
calculateFromScript(..., function() { /* callback */ });

// updateFieldStates nie czekało
updateFieldStates(...); // fire and forget
```

#### Po:
```javascript
// updateFieldStates zwraca Promise
export async function updateFieldStates(...) {
    return new Promise((resolveAll) => {
        // Sekwencyjna egzekucja skryptów
        executeNextScript();
        // Po wszystkich - resolve
    }).then(() => {
        // Sprawdzenie cen po zakończeniu
        checkIfPriceIsCorrect();
    });
}

// updateProcedure czeka na zakończenie
if (updateStates) {
    await updateFieldStates(...);
}
```

### 3. Blokowanie UI

```javascript
function disableFormButtons(disable) {
    // Blokuje: show-button, reset-button, dialog-confirm
    // Wizualnie: opacity, pointer-events, disabled attribute
}
```

**Wywołanie**:
- `disableFormButtons(true)` → na początku `updateProcedure()`
- `disableFormButtons(false)` → gdy `calculationQueue.length === 0`

### 4. Walidacja Przed Wysyłką (Defense in Depth)

```javascript
sendBtn.onclick = async function () {
    // 1. Sprawdź czy coś się liczy TERAZ
    if (window.isCalculating) {
        showToast('warning', 'Trwają obliczenia...');
        return;
    }
    
    // 2. Wymuś przeliczenie ostatniego pola
    await recalculateLastChangedField();
    
    // 3. Czekaj aż kolejka opróżni
    while (window.calculationQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // 4. Walidacja
    const isValid = await validateForm();
    
    // 5. Ostateczne sprawdzenie flag
    if (window.isPriceCalculating && !window.isCalculating) {
        await sendData();
    }
}
```

## Flow Diagram

```
User zmienia parametr
    ↓
addEventListener('change')
    ↓
updateProcedure() wywołane
    ↓
Dodaj do calculationQueue [taskId]
    ↓
Czekaj aż będziesz pierwszy ← [KOLEJKA]
    ↓
isCalculating = true
disableFormButtons(true) ← [UI ZABLOKOWANE]
    ↓
Wykonaj operacje:
  - setDescription()
  - buildValuesToDisplay()
  - updateFieldInputs()
  - await updateFieldStates() ← [TUTAJ ASYNC!]
      ↓
      executeNextScript (callback chain)
        → script 1 → callback
        → script 2 → callback
        → ... → wszystkie formuły
        → resolveAll() ← [PROMISE RESOLVE]
      ↓
      checkIfPriceIsCorrect()
    ↓
  - validateFormInput()
  - clearDisabledValues()
    ↓
calculationQueue.shift() [usuń siebie]
    ↓
Jeśli kolejka pusta:
  isCalculating = false
  isPriceCalculating = true ← [GOTOWE!]
  disableFormButtons(false) ← [UI ODBLOKOWANE]
    ↓
User może kliknąć ZAPISZ
    ↓
Sprawdź flagi + kolejkę
    ↓
Wyślij dane ✓
```

## Zabezpieczenia (Defense Layers)

1. **Kolejka zadań** - serializa operacje
2. **Blokada UI** - fizycznie niemożliwe kliknąć podczas obliczeń
3. **await na async** - gwarancja zakończenia przed next step
4. **Sprawdzenie flag** - `isPriceCalculating` i `!isCalculating`
5. **Sprawdzenie kolejki** - `calculationQueue.length === 0`
6. **Timeout w walidacji** - ostatnia deska ratunku

## Metryki Sukcesu

✅ **Nie można kliknąć ZAPISZ** podczas obliczeń (disabled button)
✅ **Kolejne zmiany parametrów** czekają na poprzednie
✅ **isPriceCalculating=true** tylko po RZECZYWISTYM zakończeniu
✅ **Żadne "race conditions"** - wszystko sekwencyjne
✅ **Widoczna informacja** dla użytkownika (spinner + disabled buttons)

## Pliki Zmodyfikowane

1. `/public/scripts/form.js`
   - Inicjalizacja flag i kolejki
   - `updateProcedure()` z kolejką i blokowaniem
   - `disableFormButtons()` nowa funkcja

2. `/public/scripts/formTools/updateFieldsAndValues.js`
   - `updateFieldStates()` → async z Promise
   - `executeNextScript()` wrapped w Promise
   - Przeniesienie `checkIfPriceIsCorrect()` do `.then()`

3. `/public/scripts/edit_form.js`
   - `setUpSaveButton()` → async/await pattern
   - Sprawdzanie `isCalculating`, `calculationQueue`, flag
   - Proper error handling

## Testing Checklist

- [ ] Zmień parametr → przycisk ZAPISZ disabled
- [ ] Zmień 3 parametry szybko → wszystkie obliczone sekwencyjnie
- [ ] Zmień parametr i natychmiast kliknij ZAPISZ → toast "Trwają obliczenia"
- [ ] Po zmianie poczekaj → przycisk odblokowany, wysyłka działa
- [ ] Sprawdź console.log czy `isPriceCalculating` zmienia się w odpowiednich momentach
- [ ] Weryfikuj czy ceny się przeliczają poprawnie
