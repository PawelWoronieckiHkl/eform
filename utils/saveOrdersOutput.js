const path = require('path');
const fs = require('fs');
const {
    fileExists,
    readFileContent,
    readFileBinary,
    removeFile,
    saveFile } = require('./fileManager');
const ownerService = require('../services/owner.js');
const { outputData, shortJsonDir } = require('../config')
const db = require("../db/db_helper.js");
const { read } = require('pdfkit');
const { at, forEach } = require('lodash');

class ordersManager {
    constructor() {
        this.data = '';
        this.userIdent = '';
        this.groupNumber = '';
        this.orgIdent = '';
        this.output_path = '';
        this.fileName = '';
        this.orderId = '';
        this.orderpos = '';
        this.orderNo = '';
        this.sendFileName = '';
    }

    setOutputPath(req, orderId, orderNo, orderpos) {

        this.user = ownerService.getCurrentUser(req);
        this.userIdent = this.user ? this.user.ident : 'unknown_user';
        this.orgIdent = this.user ? this.user.organization : 'unknown_org';
        this.orderId = orderId || 'unknown_order';
        this.orderNo = orderNo || 'unknown_orderNo';
        this.orderpos = orderpos || 'unknown_pos';
        this.output_path = outputData;
    }

    async mkDir() {
        try {
            await fs.promises.mkdir(this.output_path, { recursive: true });
        } catch (err) {
            console.error(`Failed to create directory: ${err.message}`);
        }
    }

    async saveAttachments(files, posId) {
        this.posId = posId;
        // await this.mkDir();
        let attachments = [];
        for (const file of files) {
            console.log(file);
            const extension = path.extname(file.originalname);
            const baseName = file.originalname;
            const fileName = `${this.posId}_${file.fieldname}_${baseName}`;
            this.sendFilename = `${this.orgIdent}_${this.userIdent}_${this.orderNo}_${this.orderpos}_${file.fieldname}${extension}`;
            const fullpath = path.join(this.output_path, fileName);
            const saveResult = await saveFile(fullpath, file.buffer);
            if (!saveResult) {
                console.error(`Failed to save attachment: ${fileName}`);
            }
            else {
                console.log(`Attachment saved: ${saveResult}`);
                attachments.push(saveResult);
            }
        }
        await db.updateAttachments(this.posId, attachments);

    }

    async updateAttachments(files, posId) {
        this.posId = posId;
        // await this.mkDir();
        let attachments = await db.getAttachments(posId) || [];
        const desiredAttachments = [];

        for (const file of files) {
            console.log(file);
            const extension = path.extname(file.originalname);
            const baseName = file.originalname;
            const fileName = `${this.posId}_${file.fieldname}_${baseName}`;
            desiredAttachments.push(fileName);
            if (attachments.includes(fileName)) {
                console.log(`Plik ${fileName} już istnieje, pomijam zapis.`);
                continue;
            }
            const fullpath = path.join(this.output_path, fileName);
            const saveResult = await saveFile(fullpath, file.buffer);
            if (!saveResult) {
                console.error(`Failed to save attachment: ${fileName}`);
            }
            else {
                console.log(`Attachment saved: ${saveResult}`);
                attachments.push(saveResult);
            }
        }
        
        await db.updateAttachments(this.posId, attachments);
        for (const attachment of attachments) {
            const filePath = path.join(this.output_path, attachment);
            if (!desiredAttachments.includes(attachment) && await fileExists(filePath)) {
                try {
                    await fs.promises.unlink(filePath);
                    console.log(`Deleted old attachment: ${attachment}`);
                } catch (error) {
                    console.error(`Error deleting attachment ${attachment}:`, error);
                }
            }
        }
    }

    async readAttachments(posId) {
        try {
            const attachmentsList = await db.getAttachments(posId || this.posId);
            if (!attachmentsList || attachmentsList.length === 0) {
                console.warn(`No attachments found for posId: ${posId}`);
                return {};
            }

            const attachments = {};
            for (const fileName of attachmentsList) {
                const filePath = path.join(this.output_path, fileName);
                if (await fileExists(filePath)) {
                    try {
                        const fileData = await readFileBinary(filePath);
                        attachments[fileName] = fileData;
                        console.log(`Reading attachment: ${fileName}`);
                    } catch (error) {
                        console.error(`Error reading attachment ${fileName}:`, error);
                    }
                } else {
                    console.warn(`Attachment file not found: ${fileName}`);
                }
            }
            return attachments;
        } catch (error) {
            console.error(`Error in readAttachments: ${error.message}`);
            return {};
        }

    }

    async setJsonFileName(orderPos, posId) {
        if (orderPos || posId) {
            if (posId) {
                this.posId = posId;
            }
            await this.changeAttachmentFileNames(orderPos, posId);
        }
        this.fileName = `${this.orgIdent}_${this.userIdent}_${this.orderNo}`;

        this.fullPath = `${this.output_path}/${this.fileName}.json`;
        console.log('JSON file name set to:', this.fullPath);


        return { fileName: this.fileName, fullPath: this.fullPath };
    }

    async changeAttachmentFileNames(orderPos, posId) {
        const targetPosId = posId || this.posId;
        const targetOrderPos = orderPos || this.orderpos;
        if (!targetPosId || !targetOrderPos) {
            console.warn('Missing posId/orderPos for attachment rename. Skipping.');
            return [];
        }
        const attachments = await this.readAttachments(targetPosId);
        const newAttachments = [];
        for (const [fileName, fileData] of Object.entries(attachments)) {
            let fieldName = `${fileName.split('_')[1]}_${fileName.split('_')[2]}` || 'unknown_field';

            let newFileName = `${this.orgIdent}_${this.userIdent}_${this.orderNo}_${targetOrderPos}_${fieldName}${path.extname(fileName)}`;
            console.log(`Renaming attachment ${fileName} to ${newFileName}`);
            newAttachments.push(newFileName);
            const fullPath = path.join(this.output_path, newFileName);

            const saveResult = await saveFile(fullPath, fileData);
            if (!saveResult) {
                console.error(`Failed to save renamed attachment: ${newFileName}`);
            } else {
                await removeFile(path.join(this.output_path, fileName));
                console.log(`Renamed attachment saved: ${saveResult}`);
            }
        }
        return newAttachments;
    }
}


module.exports = { ordersManager };