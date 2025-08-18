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

async function getUserName(){
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
    setTimeout(() => {
        console.log(t('base.user'), data.name);
        document.getElementById('user-info').innerHTML =  `${t('base.user')}: </br> ${data.name}`;
    }, 100);
}

getUserName()
    .catch(err => console.error('getUserName Error:', err));