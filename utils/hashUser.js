const crypto = require('crypto');

function hashUser(userIdent) {
    return crypto.createHash('md5').update(userIdent.toUpperCase()).digest('hex');
}

module.exports = { hashUser };
