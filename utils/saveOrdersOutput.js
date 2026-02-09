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
        this.orderpos = '';
        this.orderNo = '';
    }

    setOutputPath(req,orderId,orderNo,orderpos) {
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

    async saveAttachments(files) {
        await this.mkDir();
        
        for (const file of files) {
            const extension = path.extname(file.originalname);
            const filename = `${this.output_path}/${this.dirName}_${this.orderpos}_${file.fieldname}${extension}`;
            const saveResult = await saveFile(filename, file.buffer);
            if (!saveResult) {
                console.error(`Failed to save attachment: ${filename}`);
            }
            else{
                console.log(`Attachment saved: ${filename}`);
            }
        }
    }
    setJsonFileName(){
        this.fullPath = `${this.output_path}/${this.dirName}.json`;
        console.log('JSON file name set to:', this.fullPath);
        this.fileName = `${this.dirName}.json`;

        return {fileName: this.fileName, fullPath: this.fullPath};
    }
}


module.exports = { ordersManager };