const fs = require('fs');
const path = require('path');
const {dataDir} = require('../config')
const dbHelper = require('../db/db_helper.js');


class VersionManagerLocal {
    constructor() {
        this.config = null;
        this.changedFlag = null;
        this.changedFiles = null;
        this.currentVersion = null;
        this.remoteData = null;
        this.lastMetadata = null;
        this.versionFilePath = null;
    }

    async init(config) {
        console.log('init')
        this.config = config;
        this.remoteData = await this.getRemoteMetadata();
        this.lastMetadata = await this.getLastVersionFile();
        let { changed, files } = await this.compareVersions();
        this.changedFlag = changed;
        this.changedFiles = files;

        await this.copyChangedFile(this.changedFlag, this.changedFiles);
        return this;
    }

 async getRemoteMetadata() {
    console.log('getRemoteData');
    const files = [];
    const dir = this.config.remoteRoot;
    const fileList = await fs.promises.readdir(dir);
    
    for (const filename of fileList) {
        const firstLetter = filename.slice(0, 1);
        const isFormFile = !isNaN(parseFloat(firstLetter)) && isFinite(firstLetter);
        const hasValidSuffix = this.config.filesToUpdate.some(suffix => 
            filename.endsWith(suffix)
        );

        if (isFormFile && hasValidSuffix) {
            const filepath = path.join(dir, filename);
            const stat = await fs.promises.stat(filepath);
            files.push(this.normalizeFile({
                filename,
                size: stat.size,
                created: stat.birthtime
            }));
        }
    }
    return files;
}

    async getLastVersionFile() {
        console.log('getLastVersionFile')
        this.versionFilePath = path.join(this.config.remoteRoot, this.config.versionFileName);
        if (!fs.existsSync(this.versionFilePath)) {
            console.log(this.remoteData)
            await this.copyChangedFile(1,this.remoteData)
            await this.fillVersionFile(this.versionFilePath);
        }
        const data = await fs.promises.readFile(this.versionFilePath, 'utf-8');
        return JSON.parse(data);
    }

    async fillVersionFile() {
        await fs.promises.writeFile(this.versionFilePath, JSON.stringify(this.remoteData, null, 2), 'utf-8');
    }

    async compareVersions() {
        console.log('compareVersions')
        const changedFiles = [];
        for (const newFile of this.remoteData) {
            const oldFile = this.lastMetadata.find(f => f.filename === newFile.filename);
            if (!oldFile || oldFile.size !== newFile.size || oldFile.created !== newFile.created) {
                changedFiles.push(newFile);
            }
        }
        return {
            changed: changedFiles.length,
            files: changedFiles
        };
    }
// Wywołuje się dwa razy dla pliku jeden i pliku 2 paramdict
 async copyChangedFile(flag, filesList) {
        if (!flag) return;

        console.log('copyChangedFile start');

        // Grupowanie plików według numeru grupy
        const groupMap = new Map();
        for (const file of filesList) {
            const group = file.filename.slice(0, 2);
            if (!groupMap.has(group)) {
                groupMap.set(group, new Set());
            }
            groupMap.get(group).add(file.filename);
        }

        // Przetwarzanie grup
        for (const [group, filenames] of groupMap) {
            try {
                // Pobierz aktualną wersję dla grupy
                this.currentVersion = await dbHelper.getAppVersion(group, process.env.NODE_ENV || 'dev');
                console.log(`Processing group: ${group}`);

                // Inkrementacja wersji
                const lastVer = this.getVersion();
                const newVer = this.setVersion(
                    lastVer.major,
                    lastVer.minor,
                    lastVer.patch + 1
                );
                
                // Aktualizacja wersji w bazie
                await dbHelper.updateAppVersion(newVer, group,process.env.NODE_ENV || 'dev');

                // Utwórz katalog wersji
                const versionDir = path.join(
                    this.config.remoteRoot,
                    'versions',
                    group,
                    newVer
                );

                await fs.promises.mkdir(versionDir, { 
                    recursive: true, 
                    mode: 0o775 
                });
                const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
                await delay(300)

                // Kopiuj wszystkie pliki z grupy
                for (const suffix of this.config.filesToUpdate) {
                    const fileName = `${group}${suffix}`;
                    try {
                        const srcFilepath = path.join(this.config.remoteRoot, fileName);
                        const destFilepath = path.join(versionDir, fileName);
                        await fs.promises.copyFile(srcFilepath, destFilepath);
                        console.log(`Copied: ${fileName}`);
                    } catch (err) {
                        console.log(`File not found: ${fileName}`, err);
                    }
                }
            } catch (err) {
                console.error(`Error processing group ${group}:`, err);
            }
        }

        await this.fillVersionFile();
    }
    getVersion(){
        console.log('getVersion')
        const [major,minor,patch] = this.currentVersion.split('.')
        return {
            major: parseInt(major),
            minor: parseInt(minor),
            patch: parseInt(patch)
        }
    }

    setVersion(major,minor,patch){
        console.log('setVersion')
        return [major,minor,patch].join('.')
    }

    normalizeFile(file) {
        return {
            filename: file.filename,
            size: Number(file.size),
            created: typeof file.created === 'string' ? file.created : new Date(file.created).toISOString()
        };
    }
}

// Przykład użycia:
async function checkVersion(){
    const config = {
        remoteRoot: dataDir,
        versionFileName: 'version_control.json',
        filesToUpdate: ['param.txt', 'paramdict.txt']
    };
    const manager = new VersionManagerLocal();
    await manager.init(config);
    return manager
}
module.exports = {checkVersion}