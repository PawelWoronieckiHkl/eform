
const langContainer = document.querySelector(".languages");
const checkNavbar = document.querySelector(".mobile-nav");
const mobileNavCollapse = document.querySelector("#mobileNav");

function changeLangStyle() {
    // Sprawdź czy jesteśmy w widoku mobilnym
    const isMobile = window.innerWidth <= 768;

    if (isMobile && mobileNavCollapse) {
        // Przenieś języki do navbar mobilnego
        moveLangToMobileNav();
    } else {
        // Przywróć języki do oryginalnej pozycji (header)
        restoreLangToHeader();
    }
}

function moveLangToMobileNav() {
    const languageSwitcher = document.querySelector(".language-switcher");

    if (languageSwitcher && mobileNavCollapse) {
        // Sprawdź czy języki nie są już w navbar
        if (!mobileNavCollapse.querySelector(".mobile-language-switcher")) {
            // Stwórz kontener dla języków w navbar
            const mobileLanguageContainer = document.createElement("div");
            mobileLanguageContainer.className = "mobile-language-switcher";
            mobileLanguageContainer.style.cssText = `
                display: flex;
                justify-content: center;
                gap: 10px;
                padding: 15px 0;
                border-top: 1px solid #eee;
                margin-top: 15px;
            `;

            // Sklonuj switcher języków
            const clonedSwitcher = languageSwitcher.cloneNode(true);
            clonedSwitcher.style.cssText = `
                display: flex;
                gap: 18px;
                border-radius: 20px;
                padding: 5px;
                margin-left: 0 auto;
            `;

            // Dostosuj style flag w mobile navbar
            const flags = clonedSwitcher.querySelectorAll("img");
            flags.forEach(flag => {
                flag.style.cssText = `
                    width: 40px;
                    height: 37px;
                    border-radius: 4px;
                    transition: transform 0.2s ease;
                `;
            });

            mobileLanguageContainer.appendChild(clonedSwitcher);
            mobileNavCollapse.appendChild(mobileLanguageContainer);

            // Ukryj oryginalny header z językami
            langContainer.style.display = "none";
        }
    }
}

function restoreLangToHeader() {
    // Usuń języki z navbar mobilnego
    const mobileLanguageSwitcher = document.querySelector(".mobile-language-switcher");
    if (mobileLanguageSwitcher) {
        mobileLanguageSwitcher.remove();
    }

    // Pokaż oryginalny header z językami
    if (langContainer) {
        langContainer.style.display = "block";
    }
}

// Wywołaj funkcję przy załadowaniu strony
document.addEventListener("DOMContentLoaded", changeLangStyle);

// Wywołuj funkcję przy zmianie rozmiaru okna
window.addEventListener("resize", changeLangStyle);
