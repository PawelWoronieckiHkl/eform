function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
    }
    if (req.ip) {
        return req.ip;
    }
    return req.socket?.remoteAddress || '';
}

module.exports = { getClientIp };
