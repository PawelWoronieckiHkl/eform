const fs = require('fs');
const {logsDir} = require('../config');
const path = require('path');

if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

function showLog(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

function saveLogToFile(message) {

    const timestamp = new Date();
    const logMessage = `[${timestamp.toISOString()}] ${message}\n`;
    const logday = timestamp.toISOString().split('T')[0]; 
    const logFilePath = path.join(logsDir, `log-${logday}.txt`); 

    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) {
            console.error('Error writing to log file', err);
        }
    });
}

function log(message) {
    showLog(message);
    saveLogToFile(message);
}

module.exports = {
    log,
    saveLogToFile
};
