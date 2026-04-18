const path = require('path');
const { outputData, shortJsonDir } = require('../config')
const fs = require('fs');
const { slopePhotoPath } = require('../config');
const { KeyObject } = require('crypto');
const { ordersManager } = require('../utils/saveOrdersOutput');
const { log } = require('../utils/logging');
class OrderSender {

    constructor(req, order, orderItems) {
        this.orderItems = orderItems;
        this.slopePaths = [];
        this.shortItems = [];
        this.attachmentsList = [];
        this.orderPositions = [];
        this.data = {
            orderno: order?.order_idx ?? 0,
            orderid: order?.id ?? 0,
            commission: order?.commision ?? "",
            client: `${order.client_name} (${order.user_ident})`,
            organizationIdent: order.org_ident,
            userIdent: order.user_ident,
            created_date: order.created_date,
            tax: order.tax_id,
            comment: order.comment,
            sentDate: order.sent_date,
            name: order.name,
            address: order.street,
            zip: order.zip,
            city: order.city,
            country: order.country,
            email: order.email,
            phone: order.phone,
            total: order.total_price,
            total_hidden: order.total_price_hidden,
            items: []

        }
        let idx = 1;
        for (let item of orderItems) {
            this.attachSlopePhoto(item, idx);


            const rawObj = item.json_parameters;

            const sortedFilteredObj = Object.keys(rawObj)
                .sort()
                .reduce((acc, key) => {
                    acc[key] = rawObj[key];
                    return acc;
                }, {});


            this.data.items.push({
                posid: item?.id ?? 0,
                orderpos: idx,
                product: item?.asortment_group_number,
                department: item?.department ?? '',
                product_description: item?.group_name ?? '',
                commission: item?.commision ?? "",
                parameters: sortedFilteredObj,
                comment: item.comment,
                asortment: item.asrotment_group_number
            })

            this.shortItems.push({
                posid: item?.id ?? 0,
                orderpos: idx,
                product: item?.asortment_group_number,
                product_description: item?.group_name ?? '',
                commission: item?.commision ?? "",
                parameters_short: item.parameters_short
            })
            this.orderPositions.push({
                posId: item?.id ?? null,
                orderPos: item?.orderpos ?? idx
            });
            idx++;
        }
        this.ordersManagerInstance = new ordersManager();
        this.ordersManagerInstance.setOutputPath(req, this.data.orderid, this.data.orderno);
    }

    async init() {

        for (const position of this.orderPositions) {
            let positionAttachments = await this.ordersManagerInstance.changeAttachmentFileNames(position.orderPos, position.posId);
            for (let positionAttachment of positionAttachments) {
                this.attachmentsList.push(positionAttachment);
            }
        }
        const result = await this.ordersManagerInstance.setJsonFileName();
        this.fileName = result.fileName;
        this.fullPath = result.fullPath;


        return this.data
    }

    getData() {
        return this.data
    }

    async saveToFile() {
        try {
            const shortJsonPath = path.join(shortJsonDir, `${process.env.NODE_ENV}_${this.fileName}`);
            await fs.promises.mkdir(path.dirname(shortJsonPath), { recursive: true });
            await fs.promises.writeFile(shortJsonPath, JSON.stringify(this.shortItems, null, 2), 'utf-8');
        }
        catch (err) {
            log(`Failed to save short JSON file: ${err.message}`);
        }
        if (!process.env?.PRODUCTION) {
            const filePath = this.fullPath;

            try {
                await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
                await fs.promises.writeFile(filePath, JSON.stringify(this.data, null, 2), 'utf-8');
                log(`File saved successfully: ${filePath}`);
            } catch (error) {
                log(`Failed to save file: ${error.message}`);
            }
        }
        else {
            const ftp = require('basic-ftp');
            const client = new ftp.Client();
            client.ftp.verbose = true;
            const ftpConfig = {
                host: process.env.FTP_HOST,
                user: process.env.FTP_USER,
                password: process.env.FTP_PASSWORD,
                secure: false,
                remotePath: `/${this.fileName}.json`
            };
            const filePath = this.fullPath;

            try {
                await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
                await fs.promises.writeFile(filePath, JSON.stringify(this.data, null, 2), 'utf-8');
                await client.access({
                    host: ftpConfig.host,
                    user: ftpConfig.user,
                    password: ftpConfig.password,
                    secure: ftpConfig.secure
                });
                log(`Connected to FTP server: ${ftpConfig.host}`);
                const result = await client.uploadFrom(filePath, ftpConfig.remotePath);
                log(`FTP upload result: ${result}`);

                const remoteDir = path.posix.dirname(ftpConfig.remotePath);
                for (const attachment of this.attachmentsList) {
                    if (typeof attachment !== 'string') {
                        continue;
                    }
                    const attachmentPath = path.join(outputData, attachment);
                    const attachmentRemotePath = path.posix.join(remoteDir, attachment);
                    const attachmentResult = await client.uploadFrom(attachmentPath, attachmentRemotePath);
                    log(`FTP upload attachment result: ${attachmentResult}`);
                }

            }
            catch (err) {
                log(`FTP upload failed: ${err.message}`);
            }
            client.close();
        }

    }

    attachSlopePhoto(item, idx) {
        const slopeVals = item?.parameters_short?.data?.WYMIAROWANIE_SLOPOW;
        let dimensions = [];

        for (const [key, value] of Object.entries(slopeVals || {})) {
            if (key.endsWith("_VISIBLE") && value == true) {
                let baseKey = key.split('___VISIBLE')[0];
                dimensions.push(
                    { [baseKey.split('_')[1] || baseKey]: slopeVals[baseKey] });
            }
        }

        const slopeType = item?.parameters_short?.data?.WYMIAROWANIE_SLOPOW?.TYP ?? false;
        if (slopeType) {
            const slopePhotoFileName = `${slopeType}.png`;
            const slopePhotoFullPath = path.join(slopePhotoPath, slopePhotoFileName);
            this.slopePaths.push({
                photoPath: slopePhotoFullPath,
                attachmentName: `pos_${idx}_slope.png`,
                dimensions: dimensions
            });
        }

    }
}


module.exports = { OrderSender };