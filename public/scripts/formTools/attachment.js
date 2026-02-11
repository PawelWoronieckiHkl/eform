import { showToast } from "../components/toast.js";

export function checkAttachmentFileSize(file, maxSizeMB) {

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        return false;
    }
    return true;

}

// Funkcja do resetowania tylko UI załącznika (bez dotykania values i displayValues)
export function resetAttachmentUI(input, attachmentImage, fileIcon, removeBtn, param) {
    input.value = '';
    attachmentImage.src = '/img/attachment.png';
    fileIcon.dataset.tooltip = `${param.DESCRIPTION}`;
    removeBtn.style.display = 'none';
}

export function attachmentBehaviorOnClick(input, attachmentImage, fileIcon, removeBtn, param, e) {
    e.preventDefault();
    resetAttachmentUI(input, attachmentImage, fileIcon, removeBtn, param);
}

export function changeAttachmentAppearance(input, attachmentImage, fileIcon, removeBtn, param, maxSizeMB = 10) {
    const files = input?.files;
    if (files && files.length > 0) {
        const file = files[0];
        if (!checkAttachmentFileSize(file, maxSizeMB)) {
            input.value = '';
            input.dataset.filename = '';
            attachmentImage.src = '/img/attachment.png';
            fileIcon.dataset.tooltip = `${param.DESCRIPTION}`;
            removeBtn.style.display = 'none';
            showToast('error', `Maksymalny rozmiar pliku to ${maxSizeMB} MB.`, 3, 'top-center');
            return;
        }

        // Przechowuj tylko nazwę pliku (bez pełnej ścieżki c:\fakepath\)
        input.dataset.filename = file.name;
        attachmentImage.src = '/img/attachment-green.png';
        fileIcon.dataset.tooltip = `${file.name}`;
        removeBtn.style.display = 'flex';

        // Zaktualizuj values i displayValues z samą nazwą pliku
        if (window.values && input.name) {
            window.values[input.name] = file.name;
        }
        if (window.displayValues && input.name) {
            const currentValue = window.displayValues.get(input.name) || {};
            currentValue.option_value = file.name;
            currentValue.option_description = '';
            window.displayValues.set(input.name, currentValue);
        }
    } else {

        attachmentImage.src = '/img/attachment.png';
        input.dataset.filename = '';
        fileIcon.dataset.tooltip = `${param.DESCRIPTION}`;
        removeBtn.style.display = 'none';
    }
}

export async function getAttachmentsData(posId, orderId) {
    try {
        const response = await fetch(`/position/${orderId}/${posId}/attachments/`);
        if (!response.ok) {
            throw new Error('Failed to fetch attachments');
        }
        const data = await response.json();
        return data.attachments || [];
    } catch (error) {
        console.error('Error fetching attachments:', error);
        showToast('error', 'Nie udało się pobrać załączników', 3, 'top-center');
        return [];
    }
}
