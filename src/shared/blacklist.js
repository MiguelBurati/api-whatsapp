const blockedNumbers = new Set(
    (process.env.BLACKLIST_NUMBERS || '')
        .split(',')
        .map(normalizeNumber)
        .filter(Boolean)
);

function normalizeNumber(value) {
    return String(value || '').replace(/\D/g, '');
}

function isBlacklisted(...jids) {
    return jids
        .filter(Boolean)
        .some((jid) => blockedNumbers.has(normalizeNumber(jid.split('@')[0])));
}

module.exports = { isBlacklisted };