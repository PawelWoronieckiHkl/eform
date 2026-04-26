// Formatowanie etykiety klienta dla PDF/maili.
// Reguła biznesowa: ident jest ukrywany w nawiasie obok nazwy klienta,
// chyba że zaczyna się od `kn_` (case-insensitive).

function shouldShowIdent(ident) {
    return !!ident && String(ident).toLowerCase().startsWith('kn_');
}

function formatClientLabel(clientName, ident) {
    if (!clientName) return ident || '';
    if (!ident) return clientName;
    return shouldShowIdent(ident) ? `${clientName} (${ident})` : clientName;
}

// Usuwa końcowe " (ident)" z gotowej etykiety, chyba że ident zaczyna się od kn_.
function stripIdentSuffix(label) {
    if (!label) return label;
    const m = String(label).match(/^(.+?)\s*\(([^()]+)\)\s*$/);
    if (!m) return label;
    const [, name, ident] = m;
    return shouldShowIdent(ident) ? label : name.trim();
}

module.exports = { formatClientLabel, stripIdentSuffix, shouldShowIdent };
