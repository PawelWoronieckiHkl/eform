import { showToast } from "../components/toast.js";


export function checkAttachmentFileSize(file, maxSizeMB) {

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        return false;
    }
    return true;

}

export function attachmentBehaviorOnClick(input, attachmentImage, fileIcon, removeBtn, param, e) {
    e.preventDefault();
    input.value = '';
    attachmentImage.src = '/img/attachment.png';
    fileIcon.style.color = '';
    fileIcon.dataset.tooltip = `${param.DESCRIPTION}`;
    removeBtn.style.display = 'none';
}

export function changeAttachmentAppearance(input, attachmentImage, fileIcon, removeBtn, param, maxSizeMB = 10) {
    const files = input?.files;
    if (files && files.length > 0) {
        const file = files[0];
        if (!checkAttachmentFileSize(file, maxSizeMB)) {
            input.value = '';
            attachmentImage.src = '/img/attachment.png';
            fileIcon.dataset.tooltip = `${param.DESCRIPTION}`;
            removeBtn.style.display = 'none';
            showToast('error',`Maksymalny rozmiar pliku to ${maxSizeMB} MB.`, 3, 'top-center');
            return;
        }

        attachmentImage.src = '/img/attachment-green.png';
        fileIcon.dataset.tooltip = `${file.name}`;
        removeBtn.style.display = 'flex';
    } else {

        attachmentImage.src = '/img/attachment.png';
        fileIcon.dataset.tooltip = `${param.DESCRIPTION}`;
        removeBtn.style.display = 'none';
    }
}
