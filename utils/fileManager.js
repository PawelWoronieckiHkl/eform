const path = require('path');
const fs = require('fs');

async function fileExists(filePath) {
    try {
        await fs.promises.access(filePath, fs.constants.F_OK);
        return true;
    } catch (e) {
        return false;
    }
}
async function readFileContent(filePath) {
    try {
        const data = await fs.promises.readFile(filePath, 'utf-8');
        return data;
    } catch (e) {
        console.error(`Error reading file at ${filePath}:`, e);
        throw e;
    }
}

async function readFileBinary(filePath) {
    try {
        const data = await fs.promises.readFile(filePath);
        return data;
    } catch (e) {
        console.error(`Error reading binary file at ${filePath}:`, e);
        throw e;
    }
}

async function saveFile(filePath, data) {
    try {
        let finalPath = filePath;
        let counter = 1;

        // Sprawdź czy plik istnieje i znajdź wolną nazwę
        while (await fileExists(finalPath)) {
            counter++;
            const parsedPath = path.parse(filePath);
            const dir = parsedPath.dir;
            const ext = parsedPath.ext;
            const name = parsedPath.name;

            // Usuń poprzedni suffix (X) jeśli istnieje
            const nameWithoutSuffix = name.replace(/\s*\(\d+\)$/, '');

            finalPath = path.join(dir, `${nameWithoutSuffix} (${counter})${ext}`);
        }

        await fs.promises.writeFile(finalPath, data);
        console.log(`File saved successfully at ${finalPath}`);
        return path.basename(finalPath);
    } catch (e) {
        console.error(`Error saving file at ${filePath}:`, e);
        return false;
    }
}

module.exports = {
    fileExists,
    readFileContent,
    readFileBinary,
    saveFile
};

