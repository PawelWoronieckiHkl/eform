const fs = require('fs');
const {logsDir} = require('../config');
const path = require('path');

if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

function formatLogArguments(...args) {
    return args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
            try {
                return JSON.stringify(arg, null, 2);
            } catch (err) {
                return String(arg);
            }
        }
        return String(arg);
    }).join(' ');
}

function showLog(...args) {
    const message = formatLogArguments(...args);
    console.log(`[${new Date().toISOString()}] ${message}`);
}

function saveLogToFile(...args) {
    const message = formatLogArguments(...args);
    const timestamp = new Date();
    const logMessage = `[${timestamp.toISOString()}] ${message}\n`;
    const logday = timestamp.toISOString().split('T')[0];
    const logFilePath = process.env.ORDER_IMPORT_STANDALONE === '1'
        ? path.join(__dirname, '../import/import.log')
        : path.join(logsDir, `log-${logday}.txt`);

    const logDir = path.dirname(logFilePath);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) {
            console.error('Error writing to log file', err);
        }
    });
}

function log(...args) {
    showLog(...args);
    saveLogToFile(...args);
}

module.exports = {
    log,
    saveLogToFile
};
