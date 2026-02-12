const fs = require('fs');
const path = require('path');


// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

function showLog(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

function saveLogToFile(message) {

    const timestamp = new Date();
    const logMessage = `[${timestamp.toISOString()}] ${message}\n`;
    const logday = timestamp.toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
    const logFilePath = path.join(logsDir, `log-${logday}.txt`); // Log file path with date

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
