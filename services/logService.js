const { insertQuery } = require('../db/core.js');
const { getDbTimestamp } = require('../utils/humanize_date.js');
const { log } = require('../utils/logging');

async function logUserLogin(userPin, userIdent) {
    try {
        if (userPin === 'admin') { return false }
        if (!userPin) {
            throw new Error('userPin jest wymagany');
        }

        const timestamp = getDbTimestamp(); 

        const query = `
            INSERT INTO login_history (user_pin, login_time, user_ident) 
            VALUES (?, ?, ?)
        `;

        const data = [userPin, timestamp, userIdent || null];

        const result = await insertQuery(query, data);

        if (result) {
            log(`[LogService] Zapisano historię logowania dla użytkownika: ${userPin} (${userIdent || 'brak ident'}) o ${timestamp}`);
            return true;
        } else {
            log(`[LogService] Błąd podczas zapisywania historii logowania dla: ${userPin}`);
            return false;
        }

    } catch (error) {
        log(`[LogService] Błąd podczas zapisywania historii logowania:`, error.message);
        return false;
    }
}

async function getUserLoginHistory(userPin, limit = 10) {
    try {
        if (!userPin) {
            throw new Error('userPin jest wymagany');
        }

        const { selectQuery } = require('../db/core.js');

        const query = `
            SELECT id, user_pin, login_time, user_ident 
            FROM login_history 
            WHERE user_pin = ? 
            ORDER BY login_time DESC 
            LIMIT ?
        `;

        const data = [userPin, limit];

        const result = await selectQuery(query, data);

        return result || [];

    } catch (error) {
        log(`[LogService] Błąd podczas pobierania historii logowania:`, error.message);
        return false;
    }
}

async function getUserLoginHistoryByIdent(userIdent, limit = 10) {
    try {
        if (!userIdent) {
            throw new Error('userIdent jest wymagany');
        }

        const { selectQuery } = require('../db/core.js');

        const query = `
            SELECT id, user_pin, login_time, user_ident 
            FROM login_history 
            WHERE user_ident = ? 
            ORDER BY login_time DESC 
            LIMIT ?
        `;

        const data = [userIdent, limit];

        const result = await selectQuery(query, data);

        return result || [];

    } catch (error) {
        log(`[LogService] Błąd podczas pobierania historii logowania po user_ident:`, error.message);
        return false;
    }
}

async function getRecentLogins(limit = 50) {
    try {
        const { selectQuery } = require('../db/core.js');

        const query = `
            SELECT id, user_pin, login_time, user_ident 
            FROM login_history 
            ORDER BY login_time DESC 
            LIMIT ?
        `;

        const data = [limit];

        const result = await selectQuery(query, data);

        return result || [];

    } catch (error) {
        log(`[LogService] Błąd podczas pobierania ostatnich logowań:`, error.message);
        return false;
    }
}

module.exports = {
    logUserLogin,
    getUserLoginHistory,
    getUserLoginHistoryByIdent,
    getRecentLogins
};