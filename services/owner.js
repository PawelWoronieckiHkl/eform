const { getUserByIdent } = require('../db/owner');

/**
 * Ustawia kontekst użytkownika w sesji na podstawie userIdent
 * @param {Object} req - Request object
 * @param {string} userIdent - Identyfikator użytkownika
 * @returns {Object|null} Ustawiony kontekst użytkownika lub null w przypadku błędu
 */
async function setContextUserByIdent(req, userIdent) {
    try {
        // Walidacja danych wejściowych
        if (!req || !req.session) {
            throw new Error('Brak obiektu sesji w request');
        }

        if (!userIdent) {
            throw new Error('Brak userIdent');
        }

        // Pobranie danych użytkownika z bazy danych
        const userData = await getUserByIdent(userIdent);

        if (!userData) {
            console.warn(`[OwnerService] Nie znaleziono użytkownika o ident: ${userIdent}`);
            return null;
        }

        // Utworzenie kontekstu użytkownika na wzór req.session.user
        const contextUser = {
            userId: userData.id,
            pin: userData.pin,
            password: userData.password,
            showPrices: false,
            organization: userData.org_ident ? userData.org_ident.toUpperCase() : '',
            orgId: userData.organization_id,
            clientName: userData.client_name,
            ident: userData.ident,
            setAt: new Date().toISOString()
        };

        // Ustawienie kontekstu w sesji
        req.session.context_user = contextUser;

        return contextUser;

    } catch (error) {
        console.error(`[OwnerService] Błąd podczas ustawiania kontekstu użytkownika dla ident ${userIdent}:`, error.message);
        return null;
    }
}

/**
 * Pobiera kontekst użytkownika z sesji
 * @param {Object} req - Request object
 * @returns {Object|null} Kontekst użytkownika lub null
 */
function getContextUser(req) {
    try {
        if (!req || !req.session) {
            return null;
        }
        return req.session.context_user || null;
    } catch (error) {
        console.error(`[OwnerService] Błąd podczas pobierania kontekstu użytkownika:`, error.message);
        return null;
    }
}

/**
 * Czyści kontekst użytkownika z sesji
 * @param {Object} req - Request object
 * @returns {boolean} True jeśli pomyślnie wyczyszczono
 */
function clearContextUser(req) {
    try {
        if (!req || !req.session) {
            return false;
        }
        const previousContext = req.session.context_user;
        delete req.session.context_user;

        return true;
    } catch (error) {
        console.error(`[OwnerService] Błąd podczas czyszczenia kontekstu użytkownika:`, error.message);
        return false;
    }
}

/**
 * Zwraca aktualny kontekst użytkownika - context_user jeśli isOwner=true i context_user istnieje, 
 * w przeciwnym przypadku zwraca user
 * @param {Object} req - Request object
 * @returns {Object|null} Aktualny kontekst użytkownika
 */
function getCurrentUser(req) {
    try {
        if (!req || !req.session) {
            return null;
        }

        // Jeśli użytkownik jest właścicielem i istnieje context_user, zwróć context_user
        if (req.session.user?.isOwner && req.session.context_user) {
            return req.session.context_user;
        }

        // W przeciwnym przypadku zwróć standardowy user
        return req.session.user || null;
    } catch (error) {
        console.error(`[OwnerService] Błąd podczas pobierania aktualnego użytkownika:`, error.message);
        return req.session.user || null;
    }
}



module.exports = {
    setContextUserByIdent,
    getContextUser,
    clearContextUser,
    getCurrentUser
};
