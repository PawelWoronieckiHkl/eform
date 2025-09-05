
import { DataLoader } from "./dataLoader.js";
import { showToast } from "../components/toast.js";

export class FormsManager {
    constructor() {
        this.mainPath = "/data";
        this.groupFilePath = '';
        this.groupFileName = 'prod.txt';
        this.paramFile = 'param.txt';
        this.paramDictFile = 'paramDict.txt';
        this.loader = new DataLoader();
        this.paths = [];
        this.aliases = {}
        this.productUsers = [];
        this.clientData = {};
    }

    async getAvailableForms() {
        this.languages = window.langs || 'nl'
        this.language = document.documentElement.lang || 'pl';
        this.groupFilePath = `/data/data/${this.language}/group.txt`
        const data = await this.loader.loadData(this.groupFilePath);
        const objects = this.convertDataToObjects(data)
        this.departments = objects;
        this.paths = await this.getPaths();
        this.postAllPaths()

        this.clientData = await this.getOwner();
        return objects;
    }




    convertDataToObjects(csvData) {
        const filteredData = csvData.filter(row => row[0] && row[0].trim() !== '');
        const paramNames = filteredData.map(row => row[0].trim().toLowerCase());
        const numObjects = filteredData[0].length - 1;

        const objects = [];
        for (let col = 1; col <= numObjects; col++) {
            const obj = {};
            for (let row = 0; row < filteredData.length; row++) {
                let value = filteredData[row][col] ? filteredData[row][col].trim() : '';
                value = value.replace(/\r/g, '');
                obj[paramNames[row]] = value;
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
    // TUTUAJ
    setCurrentRootPath(groupNr) {
        this.currentRootPath = `${this.mainPath}/${groupNr}/data/`;
    }


    getCurrentRootPath() {
        return this.currentRootPath;
    }

    async loadDataPerClient(group) {

        if (this.aliases?.[group]) {

            const foundAliases = this.aliases[group].filter(entry =>
                entry.organization.trim().toUpperCase() === this.clientData.orgIdent.trim().toUpperCase() &&
                entry.client.trim().toUpperCase() === this.clientData.userIdent.trim().toUpperCase()
            );

            if (!foundAliases.length) {
                console.warn('Brak pasujących aliasów dla:', this.clientData);
                return {};
            }

            const allObjects = {};

            for (const foundAlias of foundAliases) {
                try {
                    const aliasPath = `${this.currentRootPath}${foundAlias.file}`;
                    const arr = await this.loader.loadData(aliasPath);

                    const headers = arr[0].map(h => h.replace(/\r/g, '').trim());
                    const objects = arr.slice(1).map(row => {
                        const obj = {};
                        headers.forEach((header, idx) => {
                            obj[header] = (row[idx] || '').replace(/\r/g, '').trim();
                        });
                        return obj;
                    });

                    allObjects[foundAlias.param] = objects;
                } catch (error) {
                    console.error(`Błąd podczas ładowania pliku ${foundAlias.file}:`, error);
                }
            }

            return allObjects;
        }
        else {
            return {}
        }
    }

    async getClientScripts() {

        // console.log(this.groupsDetails)
        const groupDetails = this.groupsDetails.find(group => group.code == window.tempGroupNumber)
        this.scriptsArr = groupDetails.param_scripts
        let foundScripts = []

        if (this.scriptsArr) {

            foundScripts = this.scriptsArr.filter(entry =>
                entry.organization.trim().toLowerCase() === this.clientData.orgIdent.trim().toLowerCase() &&
                entry.client.trim().toLowerCase() === this.clientData.userIdent.trim().toLowerCase()
            );
        }
        // console.log('jestem w skryptach3',foundScripts)
        if (!foundScripts.length) {
            console.warn('Brak pasujących aliasów dla:', this.clientData);
            return false;
        }


        let path = this.currentRootPath
        return [path, foundScripts]

    }

    async getPaths() {
        const paths = [];

        for (const department of this.departments) {
            for (const asortment of department.products) {
                const groupObj = { [asortment]: [] };

                for (const lang of this.languages) {
                    const path = `/${asortment}/data/${lang}/`;
                    groupObj[asortment].push(path);
                }

                paths.push(groupObj);
            }
        }
        return paths;
    }

    async getGroups(departmentNumber) {
        const objects = []
        const department = this.departments.find(department => department.num === departmentNumber);
        const user = this.clientData.userIdent
        for (const asortment of department.products) {
            const path = `${this.mainPath}/${asortment}/data/${this.language}/`
            const prodFilePath = `${path}${this.groupFileName}`;
            try {

                const data = await this.loader.loadData(prodFilePath);
                const object = this.convertDataToObjects(data)[0];


                if (object.paramdict_aliases) {
                    this.aliases[asortment] = await this.prepareData(object.paramdict_aliases)
                    object.paramdict_aliases = this.aliases[asortment]

                }

                if (object?.users) {
                    this.productUsers = object.users
                        .split(',')
                        .map(u => u.trim().toUpperCase());
                    const currentUser = user.toUpperCase();

                    if (!this.productUsers.includes(currentUser) && object?.users) {
                        continue
                    }
                }
                if (object.param_scripts) {
                    this.scriptsArr = await this.prepareData(object.param_scripts) ?? []
                    object.param_scripts = this.scriptsArr

                }
                this.paths.push(path);
                objects.push(object);
            }
            catch (error) {
                showToast('warning', `Brak plików dla grupy ${asortment}`);

            }
        }
        this.groupsDetails = objects;

        return objects
    }

    setCurrentGroup(groupNumber) {
        this.currentGroup = this.groupsDetails.find(group => group.code == groupNumber)


    }

    async prepareData(strings) {
        const arr = [];
        const stringList = strings.split(',');

        for (let string of stringList) {
            string = string.trim();
            const [data, file] = string.split('=');
            const [org, client, param] = data.split('/');

            arr.push({
                organization: org,
                client: client,
                param: param,
                file: file
            });
        }

        return arr;
    }

    async postAllPaths() {
        try {
            const response = await fetch('/position/versions/update/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.paths)
            });

            if (!response.ok) throw new Error('Błąd serwera');
            return await response.json();

        } catch (error) {
            console.error('Błąd podczas wysyłania ścieżek:', error);
            throw error;
        }
    }

    async getOwner() {
        try {

            const response = await fetch('/user/owner/');


            if (!response.ok) {
                let errorMsg = 'Błąd serwera';
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorMsg;
                } catch { }
                throw new Error(errorMsg);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Nieznany błąd');
            }
            return data.idents;

        } catch (error) {
            console.error('Błąd podczas pobierania właściciela:', error.message);
            throw error;
        }
    }

}

