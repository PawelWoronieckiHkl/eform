const fs = require('fs');
const path = require('path');
const dbHelper = require('../db/db_helper.js');
const { dataDir, availabeLanguages } = require('../config.js');
const { json } = require('stream/consumers');

class VersionManagerLocal {
    constructor() {
        this.filesToUpdate = ['param.txt', 'paramdict.txt'];
        this.versionFileName = 'version_control.json';
        this.langPaths = {};
    }

    async checkOkFileAndRemove(group) {
        const okFilePath = path.join(dataDir, `${group}.ok`);
        try {
            await fs.promises.access(okFilePath, fs.constants.F_OK);
            // Plik istnieje, usuwamy go po przetworzeniu
            await fs.promises.unlink(okFilePath);
            return true;
        } catch (err) {
            // Plik .ok nie istnieje
            return false;
        }
    }

    async init(groupsArray) {
        // Spłaszcz tablicę obiektów do pojedynczego obiektu
        const groups = groupsArray.reduce((acc, groupObj) => {

            let [group, paths] = Object.entries(groupObj)[0];
            const pathlist = [];
            for (let language of availabeLanguages) {
                pathlist.push(`/${group}/data/${language}`);
            }
            paths = pathlist
            acc[group] = paths;
            return acc;
        }, {});
        groups['WYMIAROWANIE_SLOPOW'] = ['/WYMIAROWANIE_SLOPOW/data/pl', '/WYMIAROWANIE_SLOPOW/data/en', '/WYMIAROWANIE_SLOPOW/data/de', '/WYMIAROWANIE_SLOPOW/data/fr', '/WYMIAROWANIE_SLOPOW/data/nl']
        for (let [group, langPaths] of Object.entries(groups)) {
            let pathlist = [];
            for (let language of availabeLanguages) {
                pathlist.push(`/${group}/data/${language}`);
            }
            langPaths = pathlist
            const okFileExists = await this.checkOkFileAndRemove(group);
            if (!okFileExists) {
                console.log(`Brak pliku ${group}.ok – pomijam aktualizację`);
                continue;
            }

            console.log('SPRAWDZAM WERSJE', group);
            const groupDataPath = path.join(dataDir, group, 'data');

            const currentMetadata = {};
            for (const langDir of langPaths) {
                const fullPath = path.join(dataDir, langDir);
                const lang = path.basename(langDir);
                currentMetadata[lang] = await this.getRemoteMetadataForDir(fullPath);
            }

            await this.processGroupChanges(group, groupDataPath, currentMetadata);

        }
        return this;
    }

    async getRemoteMetadataForDir(dir) {
        const files = [];
        try {
            const fileList = await fs.promises.readdir(dir);
            for (const filename of fileList) {
                if (this.filesToUpdate.includes(filename)) {
                    const filepath = path.join(dir, filename);
                    const stat = await fs.promises.stat(filepath);
                    files.push({
                        filename,
                        size: stat.size,
                        created: stat.birthtime.toISOString()
                    });
                }
            }
        } catch (err) {
            console.error(`Błąd w katalogu ${dir}:`);
        }
        return files;
    }

    async getLastVersionForGroup(versionPath) {
        try {
            const data = await fs.promises.readFile(versionPath, 'utf-8');
            return JSON.parse(data);
        } catch (err) {
            return {};
        }
    }

    compareGroupVersions(oldData, newData) {
        let changed = false;
        const changes = {};

        for (let [lang, files] of Object.entries(newData)) {
            const oldFiles = oldData[lang] || [];
            const langChanges = [];

            for (const newFile of files) {
                const oldFile = oldFiles.find(f => f.filename === newFile.filename);
                if (!oldFile || oldFile.size !== newFile.size || oldFile.created !== newFile.created) {
                    langChanges.push(newFile);
                }
            }

            if (langChanges.length > 0) {
                changes[lang] = langChanges;
                changed = true;
            }
        }

        return { changed, files: changes };
    }

    async processGroupChanges(group, groupPath, currentMetadata) {

        const currentVersion = await dbHelper.getAppVersion(group, process.env.NODE_ENV || 'dev');
        const [major, minor, patch] = currentVersion.split('.').map(Number);
        const newVersion = `${major}.${minor}.${patch + 1}`;

        await dbHelper.updateAppVersion(newVersion, group, process.env.NODE_ENV || 'dev');

        const versionDir = path.join(groupPath, 'versions', newVersion);
        await fs.promises.mkdir(versionDir, { recursive: true, mode: 0o775 });

        for (let [lang, files] of Object.entries(currentMetadata)) {
            const langVersionDir = path.join(versionDir, lang);
            await fs.promises.mkdir(langVersionDir, { recursive: true });

            for (const filename of this.filesToUpdate) {
                try {
                    const src = path.join(groupPath, lang, filename);
                    const dest = path.join(langVersionDir, filename);
                    await fs.promises.copyFile(src, dest);
                } catch (err) {
                    console.log(`Brak pliku ${filename} w języku ${lang}`);
                }
            }
        }
    }
}


async function checkVersion(paths) {
    const manager = new VersionManagerLocal();
    await manager.init(paths);
    return manager;
}

async function getConfigNum() {
    const numFile = path.join(dataDir, 'eform.num')
    const data = await fs.promises.readFile(numFile, 'utf-8');
    return data.trim()

}

module.exports = { checkVersion, getConfigNum };
