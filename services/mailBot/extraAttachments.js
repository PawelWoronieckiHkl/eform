const { fileExists,
    readFileBinary } = require('../../utils/fileManager');
const path = require('path');

async function getExtraAttachments(attachmentPaths) {
    const attachments = [];

    for (const item of attachmentPaths) {
        const filePath = typeof item === 'string' ? item : item?.photoPath;
        if (!filePath) {
            continue;
        }

        const exists = await fileExists(filePath);
        if (exists) {
            const content = await readFileBinary(filePath);
            const filename = typeof item === 'string'
                ? path.basename(filePath)
                : (item?.attachmentName || path.basename(filePath));

            attachments.push({
                filename: filename,
                content: content
            });
        }
    }

    return attachments;
}

module.exports = { getExtraAttachments };