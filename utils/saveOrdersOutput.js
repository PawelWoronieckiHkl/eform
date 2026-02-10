const path = require('path');
const fs = require('fs');
const {
    fileExists,
    readFileContent,
    readFileBinary,
    saveFile } = require('./fileManager');
const ownerService = require('../services/owner.js');
const { outputData, shortJsonDir } = require('../config')
const db = require("../db/db_helper.js");

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
    }

    setOutputPath(req, orderId, orderNo, orderpos) {

        this.user = ownerService.getCurrentUser(req);
        this.userIdent = this.user ? this.user.ident : 'unknown_user';
        this.orgIdent = this.user ? this.user.organization : 'unknown_org';
        this.orderId = orderId;
        this.orderNo = orderNo;
        this.dirName = `${this.orgIdent}_${this.orderId}_${this.userIdent}_${this.orderNo}`;
        this.orderpos = orderpos;

        this.output_path = path.join(outputData, this.dirName);
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
        await this.mkDir();
        let attachments = [];
        for (const file of files) {
            const extension = path.extname(file.originalname);
            const filename = `${this.dirName}_${this.orderpos}_${file.fieldname}${extension}`;
            const fullpath = path.join (this.output_path, filename);
            const saveResult = await saveFile(fullpath, file.buffer);
            if (!saveResult) {
                console.error(`Failed to save attachment: ${filename}`);
            }
            else {
                console.log(`Attachment saved: ${filename}`);
                attachments.push(filename);
            }
        }
        await db.updateAttachments(this.posId, attachments);
    }

    async readAttachments(attachmentsList) {
        const attachments = {};
        for (const file of fs.readdirSync(this.output_path)) {
            const filePath = path.join(this.output_path, file);
            if (fs.statSync(filePath).isFile()) {
                attachments[file] = await readFileBinary(filePath);
            }
        }
        return attachments;
    }

    setJsonFileName() {
        this.fullPath = `${this.output_path}/${this.dirName}.json`;
        console.log('JSON file name set to:', this.fullPath);
        this.fileName = `${this.dirName}.json`;

        return { fileName: this.fileName, fullPath: this.fullPath };
    }
}


module.exports = { ordersManager };