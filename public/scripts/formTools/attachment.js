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
            return false;
        }

        // Przechowuj tylko nazwę pliku (bez pełnej ścieżki c:\fakepath\)
        input.dataset.filename = file.name;
        attachmentImage.src = '/img/attachment-green.png';
        fileIcon.dataset.tooltip = `${file.name}`;
        removeBtn.style.display = 'flex';
        return true;
    } else {

        attachmentImage.src = '/img/attachment.png';
        input.dataset.filename = '';
        fileIcon.dataset.tooltip = `${param.DESCRIPTION}`;
        removeBtn.style.display = 'none';
    }
    return false;
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

export async function applyAttachmentFromServer(input, fileName, orderId, posId) {
    if (!input || !fileName || !orderId || !posId) {
        return false;
    }

    const attachments = await getAttachmentsData(posId, orderId);
    console.log('Załączniki z serwera:', attachments);
    if (!attachments.includes(fileName)) {
        return false;
    }

    const fileWrapper = input.closest('.attachment-item-wrapper');
    if (!fileWrapper) {
        return false;
    }

    const fileIcon = fileWrapper.querySelector('.file-upload-icon');
    const attachmentImage = fileWrapper.querySelector('img.icon');
    const removeBtn = fileWrapper.querySelector('.file-remove-btn');
    if (!attachmentImage || !fileIcon || !removeBtn) {
        return false;
    }

    attachmentImage.src = '/img/attachment-green.png';
    fileIcon.dataset.tooltip = fileName;
    fileIcon.title = fileName;
    removeBtn.style.display = 'flex';
    input.dataset.filename = fileName;
    input._fileInputValue = fileName;
    return true;
}
