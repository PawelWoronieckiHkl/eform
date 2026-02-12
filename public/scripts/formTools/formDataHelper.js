/**
 * Helper do budowania FormData z JSON i załączników
 */

/**
 * Buduje FormData zawierający dane JSON + wszystkie pliki z formularza
 * @param {Object} postBody - Obiekt z danymi do wysłania
 * @returns {FormData} - Gotowy FormData do wysłania
 */
export function buildFormDataWithAttachments(postBody) {
    const formData = new FormData();
    formData.append('data', JSON.stringify(postBody));

    // Zbierz wszystkie file inputy z całego dokumentu
    const fileInputs = document.querySelectorAll('input[type="file"]');
    console.log(`[FormData] Znaleziono ${fileInputs.length} input[type="file"]`);

    fileInputs.forEach(fileInput => {
        if (fileInput.files && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            console.log(`[FormData] Dodaję plik: ${fileInput.name} = ${file.name} (${file.size} bytes)`);
            formData.append(fileInput.name, file);
        } else {
            console.log(`[FormData] Input ${fileInput.name} nie ma plików`);
        }
    });

    return formData;
}

/**
 * Wysyła dane z załącznikami na serwer
 * @param {string} url - URL endpointa
 * @param {Object} postBody - Dane do wysłania
 * @param {string} method - Metoda HTTP (POST, PATCH, etc.)
 * @returns {Promise<Object>} - Odpowiedź z serwera
 */
export async function sendFormDataWithAttachments(url, postBody, method = 'POST') {
    const formData = buildFormDataWithAttachments(postBody);

    // Debug: wyświetl FormData zawartość
    console.log('=== WYSYŁANIE FORMDATA ===');
    console.log(`URL: ${url}, Method: ${method}`);
    for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
            console.log(`${key}: File(${value.name}, ${value.size} bytes)`);
        } else {
            console.log(`${key}: ${typeof value === 'string' ? value.substring(0, 100) : value}`);
        }
    }
    console.log('========================');

    try {
        const response = await fetch(url, {
            method: method,
            body: formData
            // Nie ustawiaj Content-Type, przeglądarka ustawi multipart/form-data
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('[FormData] Odpowiedź serwera:', result);
        return result;
    } catch (error) {
        console.error('[FormData] Błąd przy wysyłaniu:', error);
        throw error;
    }
}
