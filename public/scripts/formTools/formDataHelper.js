export function buildFormDataWithAttachments(postBody) {
    const formData = new FormData();
    formData.append('data', JSON.stringify(postBody));

    
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

export async function sendFormDataWithAttachments(url, postBody, method = 'POST') {
    const formData = buildFormDataWithAttachments(postBody);
    console.log('=== WYSYŁANIE FORMDATA ===');
    console.log(`URL: ${url}, Method: ${method}`);
    for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
            console.log(`${key}: File(${value.name}, ${value.size} bytes)`);
        } else {
            console.log(`${key}: ${typeof value === 'string' ? value.substring(0, 100) : value}`);
        }
    }
    try {
        const response = await fetch(url, {
            method: method,
            body: formData
            
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
