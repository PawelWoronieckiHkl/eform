const fs = require('fs');
const path = require('path');
const dbHelper = require('../db/db_helper.js');
const { dataDir } = require('../config.js');
const { json } = require('stream/consumers');

class VersionManagerLocal {
    constructor() {
        this.filesToUpdate = ['param.txt', 'paramdict.txt'];
        this.versionFileName = 'version_control.json';
    }

    async init(groupsArray) {
        // Spłaszcz tablicę obiektów do pojedynczego obiektu
        const groups = groupsArray.reduce((acc, groupObj) => {
            const [group, paths] = Object.entries(groupObj)[0];
            acc[group] = paths;
            return acc;
        }, {});

        for (const [group, langPaths] of Object.entries(groups)) {
            console.log(dataDir, 'datadir@@@@@@@@@@@@@')
            const groupDataPath = path.join(dataDir, group, 'data');
            const versionPath = path.join(groupDataPath, this.versionFileName);

            const currentMetadata = {};
            for (const langDir of langPaths) {
                const fullPath = path.join(dataDir, langDir);
                const lang = path.basename(langDir);
                currentMetadata[lang] = await this.getRemoteMetadataForDir(fullPath);
            }

            const lastMetadata = await this.getLastVersionForGroup(versionPath);
            console.log(versionPath)
            const { changed, files } = this.compareGroupVersions(lastMetadata, currentMetadata);

            if (changed) {
                await this.processGroupChanges(group, groupDataPath, currentMetadata, files);
            }
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

        for (const [lang, files] of Object.entries(newData)) {
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

    async processGroupChanges(group, groupPath, currentMetadata, changes) {
        // Pobierz i zaktualizuj wersję
        console.log(process.env, 'dev')
        const currentVersion = await dbHelper.getAppVersion(group, process.env.NODE_ENV || 'dev');
        const [major, minor, patch] = currentVersion.split('.').map(Number);
        const newVersion = `${major}.${minor}.${patch + 1}`;

        await dbHelper.updateAppVersion(newVersion, group,process.env.NODE_ENV || 'dev');

        // Utwórz katalog wersji
        const versionDir = path.join(groupPath, 'versions', newVersion);
        await fs.promises.mkdir(versionDir, { recursive: true, mode: 0o775 });

        // Skopiuj WSZYSTKIE języki dla grupy
        for (const [lang, files] of Object.entries(currentMetadata)) {
            const langVersionDir = path.join(versionDir, lang);
            await fs.promises.mkdir(langVersionDir, { recursive: true });

            // Kopiuj wszystkie pliki zdefiniowane w filesToUpdate
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

        // Zaktualizuj plik wersji
        await fs.promises.writeFile(
            path.join(groupPath, this.versionFileName),
            JSON.stringify(currentMetadata, null, 2),
            'utf-8'
        );
    }
}


async function checkVersion(paths) {
    const manager = new VersionManagerLocal();
    await manager.init(paths);
    return manager;
}

module.exports = { checkVersion };
