const path = require('path');
const fs = require('fs');
const {
    fileExists,
    readFileContent,
    readFileBinary,
    saveFile } = require('./fileManager');
const ownerService = require('../services/owner.js');
const { outputData, shortJsonDir } = require('../config')

class ordersManager {
    constructor() {
        this.data = '';
        this.userIdent = '';
        this.groupNumber = '';
        this.orgIdent = '';
        this.output_path = '';
        this.fileName = '';
        this.orderId = '';
        this.orderNo = '';
    }

    setOutputPath(req,orderId,orderNo) {
        this.user = ownerService.getCurrentUser(req);
        this.userIdent = this.user ? this.user.ident : 'unknown_user';
        this.orgIdent = this.user ? this.user.organization : 'unknown_org';
        this.orderId = orderId;
        this.orderNo = orderNo;
        this.dirName = `${this.orgIdent}_${this.orderId}_${this.userIdent}_${this.orderNo}`;
        this.output_path = path.join(outputData, this.dirName);
    }

    async mkDir() {
        try {
            await fs.promises.mkdir(this.output_path, { recursive: true });
        } catch (err) {
            console.error(`Failed to create directory: ${err.message}`);
        }
    }

    async saveAttachments(files) {
        await this.mkDir();
        
        for (const file of files) {
            const extension = path.extname(file.originalname);
            const filename = `${this.output_path}_${file.fieldname}${extension}`;
            const saveResult = await saveFile(filename, file.buffer);
            if (!saveResult) {
                console.error(`Failed to save attachment: ${filename}`);
            }
            else{
                console.log(`Attachment saved: ${filename}`);
            }
        }
    }
    async setJsonFileName(){

    }
}


module.exports = { ordersManager };