
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Add plugins for timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

function humanizeData(dbResponse) {

    for (let itemIdx = 0; itemIdx <= dbResponse.length; itemIdx++) {
        try {
            // console.log(dbResponse[itemIdx])

            const createdDate = new Date(dbResponse[itemIdx].created_date);
            dbResponse[itemIdx].created_date = createdDate.toLocaleString('pl-PL');

            const sentDate = new Date(dbResponse[itemIdx].sent_date)
            dbResponse[itemIdx].sent_date = sentDate.toLocaleString('pl-PL');
            // console.log(dbResponse[itemIdx])

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

/**
 * Formatuje czas logowania z bazy danych na polską strefę czasową
 * @param {string|Date} dbTimestamp - timestamp z bazy danych
 * @returns {string} sformatowany czas w strefie polskiej
 */
function formatLoginTime(dbTimestamp) {
    try {
        // Konwertuj timestamp z bazy danych na polską strefę czasową
        return dayjs(dbTimestamp)
            .tz('Europe/Warsaw')
            .format('DD.MM.YYYY HH:mm:ss');
    } catch (error) {
        console.error('Error formatting login time:', error);
        // Fallback do prostego formatowania
        return new Date(dbTimestamp).toLocaleString('pl-PL', {
            timeZone: 'Europe/Warsaw'
        });
    }
}

module.exports = {
    humanizeData,
    getDbTimestamp,
    formatLoginTime
};