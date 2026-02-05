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

module.exports = {
    fileExists,
    readFileContent,
    readFileBinary
};

