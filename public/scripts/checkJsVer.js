function jsCheck() {
    try {
        // Próba użycia nowej składni
        eval("var test = {}?.a");
        console.log('Przeglądarka aktualna')
    } catch (e) {
        alert("Twoja przeglądarka jest przestarzała i wymaga aktualizacji!");
    }
}
