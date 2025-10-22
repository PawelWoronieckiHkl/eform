import { getEnvVersion } from "./getEnv.js";
async function getLogo() {
    try {
        const response = await fetch('/user/logo', {
            method: 'GET',
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Status nieok: ' + response.status);

        const blob = await response.blob();
        const images = document.querySelectorAll('.logo');
        if (images.length === 0) throw new Error('Brak .logo w DOM');

        const base64data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        await Promise.all(Array.from(images).map(img => {
            return new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error('Błąd ładowania obrazu'));
                img.src = base64data;
            });
        }));

    } catch (err) {
        console.error('getLogo Error:', err);
        throw err;
    }
}

// Wywołanie z obsługą błędów
getLogo()
    .catch(err => console.error('Final error:', err));


export function validate(validateClass) {
    let inputs = document.querySelectorAll(validateClass);
    let allValid = true;

    inputs.forEach(field => {
        const value = typeof field.value === 'string' ? field.value.trim() : '';

        // Szukamy istniejącego komunikatu błędu
        let errorMsg = field.nextElementSibling;
        if (!errorMsg || !errorMsg.classList.contains('input-error-msg')) {
            errorMsg = null;
        }

        if (value.length < 1) {
            field.classList.add('input-error');
            allValid = false;

            if (!errorMsg) {
                // Tworzymy komunikat, jeśli jeszcze go nie ma
                errorMsg = document.createElement('div');
                errorMsg.className = 'input-error-msg';
                errorMsg.textContent = t('form.field_cant_be_empty');
                field.parentNode.insertBefore(errorMsg, field.nextSibling);
            }
        } else {
            field.classList.remove('input-error');
            if (errorMsg) {
                errorMsg.remove();
            }
        }
    });

    return allValid;
}

async function getUserName() {
    const user = await fetch('/user/name', {
        method: 'GET',
        credentials: 'include'
    });
    if (!user.ok) {
        throw new Error('Nie udało się pobrać nazwy użytkownika: ' + user.status);
    }
    const data = await user.json();
    if (!data.success) {
        throw new Error('Błąd pobierania nazwy użytkownika: ' + data.message);
    }

    // Sprawdź context user
    let contextInfo = '';
    try {
        const contextBtns = document.querySelectorAll('.context-button');
        const contextResponse = await fetch('/context-user', {
            method: 'GET',
            credentials: 'include'
        });
        if (contextResponse.ok) {
            const contextData = await contextResponse.json();
            if (contextData.success && contextData.contextUser) {
                window.context = true
                contextBtns.forEach(contextBtn => {
                    contextBtn.classList.remove('d-none');
                });
                contextInfo = `<br>(${contextData.ident})`;
            }
            else{window.context = false
                contextBtns.forEach(contextBtn => {
                    contextBtn.classList.add('d-none');
                });
            }
        }
    } catch (err) {
        console.error('Błąd pobierania context user:', err);
    }

    setTimeout(() => {
        console.log(t('base.user'), data.name);
        document.getElementById('user-info').innerHTML = `${t('base.user')}: </br> ${data.name}${contextInfo}`;
    }, 100);
}





async function getConfigNum() {
    const version = await getEnvVersion();
    const user = await fetch('/config-num', {
        method: 'GET',

    });
    const data = await user.json();

    if (!data.success) {

        throw new Error('Błąd pobierania nazwy użytkownika: ' + data.message);

    }



    console.log('wersja', data);

    document.getElementById('config-number-info').innerHTML =

        `Numer konfiguracji <br> ${data.name}`;


}




getConfigNum()

getUserName()
    .catch(err => console.error('getUserName Error:', err));

// Desktop navigation toggle functionality
document.addEventListener('DOMContentLoaded', function () {
    const navToggleBtn = document.getElementById('navToggleBtn');
    const desktopNav = document.querySelector('.desktop-nav');

    if (navToggleBtn && desktopNav) {
        // Check for saved state in localStorage and sync with html class
        const isCollapsed = localStorage.getItem('nav-collapsed') === 'true';
        if (isCollapsed) {
            document.documentElement.classList.add('nav-collapsed');
            desktopNav.classList.add('collapsed');
        }

        navToggleBtn.addEventListener('click', function () {
            const isCurrentlyCollapsed = document.documentElement.classList.contains('nav-collapsed');

            if (isCurrentlyCollapsed) {
                document.documentElement.classList.remove('nav-collapsed');
                desktopNav.classList.remove('collapsed');
                localStorage.setItem('nav-collapsed', 'false');
            } else {
                document.documentElement.classList.add('nav-collapsed');
                desktopNav.classList.add('collapsed');
                localStorage.setItem('nav-collapsed', 'true');
            }
        });
    }
});

// Logout functionality for both desktop and mobile nav
document.addEventListener('DOMContentLoaded', function () {
    const desktopLogoutLink = document.querySelector('[data-action="logout"]');
    const mobileLogoutLink = document.getElementById('mobile-logout-link');

    function handleLogout(event) {
        event.preventDefault();

        // Create a form and submit it for POST logout
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/user/logout';
        document.body.appendChild(form);
        form.submit();
    }

    if (desktopLogoutLink) {
        desktopLogoutLink.addEventListener('click', handleLogout);
    }

    if (mobileLogoutLink) {
        mobileLogoutLink.addEventListener('click', handleLogout);
    }
});