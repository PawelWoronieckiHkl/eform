const crypto = require('crypto');

function hashUser(userIdent) {
    return crypto.createHash('md5').update(userIdent).digest('hex');
}

module.exports = { hashUser };
