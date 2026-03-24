const { usersPath } = require('../config.js');
const path = require('path');
const fs = require('fs').promises;
const db = require("../db/db_helper.js");


class SyncProdStatus {
    constructor() {
        this.filePath = path.join(usersPath, 'status.txt');
        this.data = null;
        this.orgIdent = null;
        this.userIdent = null;
    }

    async init(orgIdent, userIdent) {
        this.orgIdent = orgIdent;
        this.userIdent = userIdent;
        await this.loadData();
        return await this.convertDataIntoObject();
    }

    async loadData() {
        try {
            const fileContent = await fs.readFile(this.filePath, 'utf-8');
            this.data = fileContent;
        } catch (error) {
            if (error.code === 'ENOENT') {
                this.data = null;
            } else {
                throw error;
            }
        }
    }

    async convertDataIntoObject() {
        if (this.data === null) {
            return null;
        }

        const lines = this.data
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (lines.length === 0) {
            return [];
        }

        const headerLine = lines[0];
        let headers = headerLine.split(/\t+/).map(h => h.trim()).filter(Boolean);
        if (headers.length <= 1) {
            headers = headerLine.split(/\s+/).map(h => h.trim()).filter(Boolean);
        }

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            let values = line.split(/\t+/).map(v => v.trim());
            if (values.length <= 1) {
                values = line.split(/\s+/).map(v => v.trim());
            }

            if (values.length === 0) {
                continue;
            }

            const rowObj = {};
            for (let j = 0; j < headers.length; j++) {
                rowObj[headers[j]] = values[j] ?? '';
            }

            if (rowObj.ORGANIZATIONIDENT === this.orgIdent && rowObj.USERIDENT === this.userIdent) {
                rows.push(rowObj);
            }
        }
        this.statusesData = rows;
        await this.checkIfStatusExistInDb();
        return this.statusesData;
    }

    async checkIfStatusExistInDb() {
        if (!this.statusesData || this.statusesData.length === 0) {
            return;
        }
        for (const record of this.statusesData) {
            const exists = await db.checkIfStatusExists(record);
            if (exists && exists.length > 0) {
                let result = await db.updateStatus(record);
                console.log('Updated status with result:', result);
            } else {
                console.log(`Status does NOT exist in DB for ORDERNO: ${record.ORDERNO}, ORDERPOS: ${record.ORDERPOS}`);
                let result = await db.insertStatus(record);
                console.log('Inserted status with result:', result);
            }
        }

        const uniqueOrders = [...new Set(this.statusesData.map(r => r.ORDERNO))];
        for (const orderIdx of uniqueOrders) {
            await db.syncOrderFromStatuses(this.userIdent, orderIdx);
        }
    }


}

function setParcelHref(statuses) {
    if (!Array.isArray(statuses)) {
        return statuses;
    }
    for (const status of statuses) {
        let [parcel, code] = status.parcel_code?.split(' ') ?? ['', ''];
        if (code) {
            switch (parcel) {
                case 'DPD':
                    status.parcel_href = `https://www.dpd.com.pl/tracking/?parcelNumber=${code}`;
                    break;
                case 'UPS':
                    status.parcel_href = `https://www.ups.com/track?loc=en_US&tracknum=${code}`;
                    break;
                case 'DHL':
                    status.parcel_href = `https://www.dhl.com/en/express/tracking.html?AWB=${code}&brand=DHL`;
                    break;
                default:
                    status.parcel_href = null;
            }
        }
    }
    console.log(statuses, 'STATUSES WITH PARCEL HREF');
    return statuses;
}

function parseSpeditionNumbers(speditionNumbersJson) {
    if (!speditionNumbersJson) {
        return [];
    }

    try {
        const parcelCodes = typeof speditionNumbersJson === 'string'
            ? JSON.parse(speditionNumbersJson)
            : speditionNumbersJson;

        if (!Array.isArray(parcelCodes)) {
            return [];
        }

        return parcelCodes.map(parcelCode => {
            if (!parcelCode) return null;

            const [carrier, code] = parcelCode.split(' ');
            if (!code) return { carrier: '', code: parcelCode, href: null };

            let href = null;
            switch (carrier) {
                case 'DPD':
                    href = `https://www.dpd.com.pl/tracking/?parcelNumber=${code}`;
                    break;
                case 'UPS':
                    href = `https://www.ups.com/track?loc=en_US&tracknum=${code}`;
                    break;
                case 'DHL':
                    href = `https://www.dhl.com/en/express/tracking.html?AWB=${code}&brand=DHL`;
                    break;
            }

            return {
                carrier,
                code,
                href,
                fullCode: parcelCode
            };
        }).filter(item => item !== null);
    } catch (error) {
        console.error('Error parsing spedition numbers:', error);
        return [];
    }
}

module.exports = { SyncProdStatus, setParcelHref, parseSpeditionNumbers };