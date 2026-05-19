const usersDb = require('../db/users.js');
const { log } = require('../utils/logging');

/**
 * Middleware ładujący uprawnienia pracownika do sesji.
 * Odczytuje uprawnienia z DB przy każdym żądaniu do chronionych endpointów.
 * Dla użytkowników niebędących pracownikami (właściciele) — przepuszcza bez zmian.
 */
async function loadEmployeePermissions(req, res, next) {
    try {
        // Jeśli użytkownik nie jest pracownikiem — przepuść dalej
        if (!req.session.user?.isEmployee) {
            return next();
        }

        const employeeId = req.session.employee?.id;
        if (!employeeId) {
            return next();
        }

        // Odczyt uprawnień z DB przy każdym żądaniu (gwarancja aktualności)
        const permissions = await usersDb.getEmployeePermissions(employeeId);

        if (permissions) {
            req.session.employeePermissions = {
                can_send_orders: permissions.can_send_orders === 1,
                can_see_prices: permissions.can_see_prices === 1,
                can_see_all_orders: permissions.can_see_all_orders === 1,
                price_factor: permissions.price_factor || 1.0
            };
        } else {
            // Pracownik nie znaleziony w DB — domyślnie brak uprawnień
            req.session.employeePermissions = {
                can_send_orders: false,
                can_see_prices: false,
                can_see_all_orders: false,
                price_factor: 1.0
            };
        }

        next();
    } catch (err) {
        log('Error loading employee permissions:', err.message);
        // W przypadku błędu — ustaw domyślne (restrykcyjne) uprawnienia i kontynuuj
        req.session.employeePermissions = {
            can_send_orders: false,
            can_see_prices: false,
            can_see_all_orders: false,
            price_factor: 1.0
        };
        next();
    }
}

/**
 * Middleware blokujący wysyłanie zamówień dla pracowników bez uprawnienia.
 * Właściciele (brak employeePermissions w sesji) są przepuszczani bez sprawdzania.
 */
function requireSendPermission(req, res, next) {
    // Jeśli użytkownik nie jest pracownikiem — przepuść (właściciel ma pełny dostęp)
    if (!req.session.employeePermissions) {
        return next();
    }

    // Pracownik z uprawnieniem — przepuść
    if (req.session.employeePermissions.can_send_orders === true) {
        return next();
    }

    // Pracownik bez uprawnienia — zablokuj
    return res.status(403).json({ error: "Brak uprawnień do wysyłania zamówień" });
}

/**
 * Middleware ustawiający flagę req.hidePrices na podstawie uprawnienia can_see_prices.
 * Nie blokuje żądania — jedynie ustawia flagę do użycia w route handlerach i szablonach.
 * Dla użytkowników niebędących pracownikami — ceny są zawsze widoczne.
 */
function filterPriceData(req, res, next) {
    // Jeśli użytkownik nie jest pracownikiem (brak employeePermissions w sesji) — ceny widoczne
    if (!req.session.employeePermissions) {
        req.hidePrices = false;
        return next();
    }

    // Pracownik z uprawnieniem can_see_prices — ceny widoczne
    if (req.session.employeePermissions.can_see_prices === true) {
        req.hidePrices = false;
    } else {
        // Pracownik bez uprawnienia — ukryj ceny
        req.hidePrices = true;
    }

    next();
}

/**
 * Middleware ustawiający filtr zamówień na podstawie uprawnienia can_see_all_orders.
 * - Właściciel (nie-pracownik): req.orderFilter = null (brak filtrowania)
 * - Pracownik z can_see_all_orders: req.orderFilter = { type: 'all', userId } (wszystkie zamówienia klienta)
 * - Pracownik bez can_see_all_orders: req.orderFilter = { type: 'own', employeeId } (tylko własne zamówienia)
 */
function filterOrdersByPermission(req, res, next) {
    // Jeśli użytkownik nie jest pracownikiem — brak filtrowania (właściciel widzi wszystko)
    if (!req.session.employeePermissions) {
        req.orderFilter = null;
        return next();
    }

    if (req.session.employeePermissions.can_see_all_orders === true) {
        // Pracownik z uprawnieniem — widzi wszystkie zamówienia właściciela/klienta
        req.orderFilter = { type: 'all', userId: req.session.user.id };
    } else {
        // Pracownik bez uprawnienia — widzi tylko swoje zamówienia
        req.orderFilter = { type: 'own', employeeId: req.session.employee.id };
    }

    next();
}

module.exports = { loadEmployeePermissions, requireSendPermission, filterPriceData, filterOrdersByPermission };
