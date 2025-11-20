import { DataLoader } from "./dataLoader.js";

export class Translator {
    constructor() {
        this.lang = 'pl';
        this.filePath = ''
        this.groupNumber = '';
        this.stringsFile = 'strings.txt';
        this.string = ''
        this.loader = new DataLoader();
    }


    async init(groupNumber, lang) {
        this.stringsFilePath = `/data/${groupNumber}/data/${lang}/${this.stringsFile}`
        this.stringsContent = await this.loadData()
        // console.log('tlumacz ogarniety', this.stringsContent)
    }

    async loadData() {
        const data = await this.loader.loadData(this.stringsFilePath);
        const objects = this.convertDataToObjects(data)
        return objects
    }

    convertDataToObjects(csvData) {
        if (csvData) {
            const filteredData = csvData.filter(row => row[0] && row[0].trim() !== '');
            const paramNames = filteredData.map(row => row[0].trim().toLowerCase());
            const numObjects = filteredData[0].length - 1;

            const objects = [];
            for (let col = 1; col <= numObjects; col++) {
                const obj = {};
                for (let row = 0; row < filteredData.length; row++) {
                    let value = filteredData[row][col] ? filteredData[row][col].trim() : '';
                    value = value.replace(/\r/g, '');
                    if (value !== '<NULL>') { obj[paramNames[row]] = value; }
                }
                objects.push(obj);
            }
            for (const obj of objects) {

                if (obj?.products && obj.products !== "") {
                    const products = obj.products.split(",");
                    obj.products = products.map(product => product.trim());
                }
            }

            return objects;
        }
        else{
            console.log('Brak danych do załadowania tłumaczeń')
            return {};
        }
    }

    checkString(string) {
        if (typeof string !== "string" || !string) return string;
        
        const re = /!([^!]+)!/g;
        const missing = new Set();

        const replaced = string.replace(re, (full, token) => {
            const key = String(token).trim().toLowerCase();
            // console.log(token, key, 'tlumacz1', this.stringsContent)
            if (!key) return full;

            let value;

            if (Object.keys(this.stringsContent).length== 0) {
                // console.log(key, 'brak tlumaczen')
                return t(`translate.${key}`)
                
            }

            else if (Array.isArray(this.stringsContent)) {
                for (const obj of this.stringsContent) {
                    if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
                        const v = obj[key];
                        if (v !== undefined && v !== '') { value = v; break; }
                    }
                }
            } else if (this.stringsContent && typeof this.stringsContent === 'object') {
                if (Object.prototype.hasOwnProperty.call(this.stringsContent, key)) {
                    const v = this.stringsContent[key];
                    if (v !== undefined && v !== '') value = v;
                }
            }
            

            if (value === undefined) {
                missing.add(key);
                return full; // leave original token when missing
            }

            return value;
        });

        if (missing.size > 0) {
            console.warn('Missing translation keys:', Array.from(missing).join(', '));
        }

        return replaced;
    }

}
