const path = require('path');
const { outputData } = require('../config')
const fs = require('fs');

class OrderSender {

    constructor(order, orderItems) {
        console.log(order)
        this.data = {
            orderno: order?.order_idx ?? 0,
            orderid: order?.id ?? 0,
            commission: order?.commision ?? "",
            client: order.client_name,
            organizationIdent: order.org_ident,
            userIdent: order.user_ident,
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
                product_description: item?.group_name ?? '',
                commission: item?.commision ?? "",
                parameters: sortedFilteredObj,
                comment: item.comment,
                asortment: item.asrotment_group_number
            })
            idx++;
        }
        this.output_path = outputData
        this.fileName = `${this.data.organizationIdent}_${this.data.orderno}.json`;
    }

    async init() {
        this.saveToFile()
        return this.data
    }

    async saveToFile() {
        if (!process.env?.PRODUCTION) {
            const filePath = path.join(this.output_path, this.fileName);
       
            try {
                await fs.promises.writeFile(filePath, JSON.stringify(this.data, null, 2), 'utf-8');

            } catch (error) {
                console.error(`Failed to save file: ${error.message}`);
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
                remotePath: `/${this.fileName}`
            };
            const filePath = path.join(this.output_path, this.fileName);

            try {
                await fs.promises.writeFile(filePath, JSON.stringify(this.data, null, 2), 'utf-8');
                await client.access({
                    host: ftpConfig.host,
                    user: ftpConfig.user,
                    password: ftpConfig.password,
                    secure: ftpConfig.secure
                });
                await client.uploadFrom(filePath, ftpConfig.remotePath);
            } catch (err) {
                console.error(`FTP upload failed: ${err.message}`);
            }
            client.close();
        }

    }

}
module.exports = { OrderSender };