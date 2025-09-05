import { DataLoader } from "./dataLoader.js";

export class AttrLoader {
    constructor() {
        this.mainPath = "/data"
        this.groupNumber = null;
        this.map = new Map();
        this.loaded = false;
        this.fileName = null;
        this.value = null;
        this.file = 'paramdictattr-KOLOR-!storage!.txt';
        this.loader = new DataLoader();
    }

    async init(groupNumber) {
        this.groupNumber = groupNumber;
        this.loadFile()
    }

    async loadFile() {
        const translatedFile = window.translator.checkString(this.file)
        console.log('przetłumaczone', translatedFile)
        const attrPath = `${this.mainPath}/${this.groupNumber}/data/${this.file}`;
        const data = await this.loader.loadData(attrPath);
        const objects = this.convertDataToObjects(data)
        this.attrValues = objects
        console.log(this.attrValues, 'semafor')
    }

    convertDataToObjects(csvData) {
        // Zakładamy csvData w formacie: [ [VALUE, ATTR_VALUE, ATTR_DESCRIPTION], ... ]
        const headers = csvData[0].map(h => h.trim().toUpperCase());
        const result = {};

        for (let col = 1; col < headers.length; col++) {
            const key = headers[col];
            result[key] = [];
            for (let row = 1; row < csvData.length; row++) {
                const valueKey = csvData[row][0].trim();
                let value = csvData[row][col] ? csvData[row][col].trim() : '';
                value = value.replace(/\r/g, '');

                if (value.match(/!(.+?)!/)) {
                    value = window.translator.checkString(value);
                }

                if (value !== '<NULL>') {
                    const obj = {};
                    obj[valueKey] = value;
                    result[key].push(obj);
                }
                // Jeśli wartość to <NULL>, pomijamy ją (nie dodajemy do tablicy)
            }
        }
        return result;
    }


    find(value) {
        if (!this.map) return null;
        return this.map.get(String(value)) || null;
    }

    // convenience: return attrValue or null
    findAttrValue(value) {
        const e = this.find(value);
        return e ? e.attrValue : null;
    }

    // convenience: return delivery date string or null
    findDelivery(value) {
        const e = this.find(value);
        return e ? e.delivery : null;
    }
}