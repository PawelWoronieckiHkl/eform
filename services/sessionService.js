let sessionStore = null;

function setStore(store) {
    sessionStore = store;
}

function getActiveSessions() {
    return new Promise((resolve, reject) => {
        if (!sessionStore || typeof sessionStore.all !== 'function') {
            return resolve([]);
        }
        sessionStore.all((err, sessions) => {
            if (err) return reject(err);
            const active = [];
            const entries = Array.isArray(sessions) ? sessions : Object.values(sessions || {});
            for (const sess of entries) {
                if (sess && sess.user && sess.user.pin) {
                    let role = 'Klient';
                    if (sess.user.isAdmin) role = 'Admin';
                    else if (sess.user.isOwner) role = 'Owner';
                    else if (sess.user.isEmployee) role = 'Pracownik';

                    const contextIdent = sess.context_user ? sess.context_user.ident || sess.context_user.pin : null;

                    active.push({
                        ident: sess.user.ident || sess.user.pin,
                        pin: sess.user.pin,
                        role: role,
                        organization: sess.user.organization || '',
                        contextUser: contextIdent,
                        isAdmin: sess.user.isAdmin || false,
                        isOwner: sess.user.isOwner || false,
                        isEmployee: sess.user.isEmployee || false
                    });
                }
            }
            resolve(active);
        });
    });
}

module.exports = { setStore, getActiveSessions };
