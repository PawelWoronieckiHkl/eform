const ignoredClients = require('../ignore_mail_list.json');

function normalizeClientKey(value) {
    if (value === null || value === undefined) {
        return '';
    }

    return String(value).trim().toLowerCase();
}

const ignoredClientKeys = new Set(
    (Array.isArray(ignoredClients) ? ignoredClients : [])
        .map(normalizeClientKey)
        .filter(Boolean)
);

function isProductionVersion() {
    return !!process.env?.PRODUCTION;
}

function collectClientKeys(value, keys = []) {
    if (Array.isArray(value)) {
        value.forEach(item => collectClientKeys(item, keys));
        return keys;
    }

    if (value && typeof value === 'object') {
        keys.push(
            value.user_ident,
            value.userIdent,
            value.ident,
            value.client_name,
            value.clientName,
            value.client
        );
        return keys;
    }

    keys.push(value);
    return keys;
}

function findIgnoredClientKey(orderOrClient, extraClientKeys = []) {
    return collectClientKeys([orderOrClient, extraClientKeys])
        .find(value => ignoredClientKeys.has(normalizeClientKey(value))) || null;
}

function getProductionSendSkipClient(orderOrClient, extraClientKeys = []) {
    if (!isProductionVersion()) {
        return null;
    }

    return findIgnoredClientKey(orderOrClient, extraClientKeys);
}

module.exports = {
    findIgnoredClientKey,
    getProductionSendSkipClient,
    isProductionVersion
};
