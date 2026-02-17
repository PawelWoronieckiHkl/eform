
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

function humanizeData(dbResponse) {

    for (let itemIdx = 0; itemIdx <= dbResponse.length; itemIdx++) {
        try {

            const createdDate = new Date(dbResponse[itemIdx].created_date);
            dbResponse[itemIdx].created_date = createdDate.toLocaleString('pl-PL');

            const sentDate = new Date(dbResponse[itemIdx].sent_date)
            dbResponse[itemIdx].sent_date = sentDate.toLocaleString('pl-PL');

        }
        catch {
            console.log('Puste pole')
        }
    }
    return dbResponse;
}

function getDbTimestamp() {
    return dayjs().tz('Europe/Warsaw').format('YYYY-MM-DD HH:mm:ss');
}

function formatLoginTime(dbTimestamp) {
    try {
        return dayjs(dbTimestamp)
            .tz('Europe/Warsaw')
            .format('DD.MM.YYYY HH:mm:ss');
    } catch (error) {
        console.error('Error formatting login time:', error);
        return new Date(dbTimestamp).toLocaleString('pl-PL', {
            timeZone: 'Europe/Warsaw'
        });
    }
}

function convertToSQLDate(inputDate) {
    if (!inputDate) {
        return null;
    }

    const parsedDate = dayjs(inputDate, 'YYYY-MM-DD', true);
    if (!parsedDate.isValid()) {
        return null;
    }

    return parsedDate.format('YYYY-MM-DD');
}

module.exports = {
    humanizeData,
    getDbTimestamp,
    formatLoginTime,
    convertToSQLDate
};