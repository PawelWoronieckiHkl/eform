/**
 * Intro.js step definitions — multilingual via window.t().
 * Tour flow: Home → New Order → Orders → History → (end)
 */

const t = (key) => window.t ? window.t(key) : key;

// ─── z-index helpers per page ───────────────────────────────────────────────

export function getDivToChangeIndex(pathname) {
    const mapping = {
        '/': {
            container: document.querySelector('.desktop-nav'),
            elements: ['new-order-nav-btn', 'orders-nav-btn', 'orders-history-nav-btn', 'employee-panel-nav-btn']
        },
        '/orders/add-order': {
            container: document.getElementById('new-order-card'),
            elements: ['commission-input', 'new-order-card', 'address-checkbox-container', 'send-address-checkbox-container']
        },
        '/orders': {
            container: document.querySelector('.order-row'),
            elements: ['order-row', 'delete-order-btn', 'edit-order-btn', 'send-order']
        },
        '/orders/history': {
            container: document.querySelector('.order-row'),
            elements: ['container', 'order-row', 'copy-order-btn']
        },
        '/user/employee-panel': {
            container: document.querySelector('.employees-container'),
            elements: ['employees-container']
        }
    };

    if (/^\/orders\/order\/\d+$/.test(pathname)) {
        return {
            container: document.getElementById('order-nav'),
            elements: ['order-nav', 'new-order-button', 'edit-order-button', 'short-print-button', 'print-button', 'generate-excel-btn']
        };
    }

    return mapping[pathname] || { container: null, elements: [] };
}

// ─── redirections between pages (tour continuation) ─────────────────────────

export function getRedirectionAfterIntro(pathname) {
    const map = {
        '/': '/orders/add-order',
        '/orders': '/orders/history'
    };

    if (map[pathname]) {
        window.location.href = map[pathname];
    }
}

// ─── overlay for special cases ──────────────────────────────────────────────

export function createOverlayDiv() {
    let div = document.getElementById('intro-overlay-div');
    if (!div) {
        div = document.createElement('div');
        div.id = 'intro-overlay-div';
        Object.assign(div.style, {
            position: 'fixed', top: '0', left: '0',
            width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: '198'
        });
        document.body.appendChild(div);
    }
    return div;
}

// ─── step definitions per page ──────────────────────────────────────────────

export function getStepsForPage(pathname) {

    const stepsConfig = {
        // ── Home (/): navbar orientation ────────────────────────────────────
        '/': [
            {
                intro: t('intro.home_welcome'),
                position: 'floating',
                tooltipClass: 'introjs-center-tooltip'
            },
            {
                element: '#new-order-nav-btn',
                intro: t('intro.home_new_order'),
                position: 'bottom-right-aligned'
            },
            {
                element: '#orders-nav-btn',
                intro: t('intro.home_orders'),
                position: 'bottom-right-aligned'
            },
            {
                element: '#orders-history-nav-btn',
                intro: t('intro.home_history'),
                position: 'bottom-right-aligned'
            },
            {
                element: '#employee-panel-nav-btn',
                intro: t('intro.home_employee'),
                position: 'bottom-right-aligned'
            },
            {
                element: '#new-order-nav-btn',
                intro: t('intro.home_go_to_new_order'),
                position: 'floating',
                tooltipClass: 'introjs-left-tooltip'
            }
        ],

        // ── New Order (/orders/add-order) ───────────────────────────────────
        '/orders/add-order': [
            {
                intro: t('intro.new_order_welcome'),
                position: 'floating',
                tooltipClass: 'introjs-center-tooltip'
            },
            {
                element: '#new-order-card',
                intro: t('intro.new_order_form'),
                position: 'bottom',
                tooltipClass: 'introjs-under-tooltip'
            },
            {
                element: '#commission-input',
                intro: t('intro.new_order_commission'),
                position: 'bottom',
                tooltipClass: 'introjs-under-tooltip'
            },
            {
                element: '#address-checkbox-container',
                intro: t('intro.new_order_address'),
                position: 'bottom',
                tooltipClass: 'introjs-under-tooltip'
            },
            {
                element: '#send-address-checkbox-container',
                intro: t('intro.new_order_send_address'),
                position: 'bottom',
                tooltipClass: 'introjs-under-tooltip'
            },
            {
                intro: t('intro.new_order_fill'),
                position: 'floating',
                tooltipClass: 'introjs-center-tooltip'
            }
        ],

        // ── Orders list (/orders) ───────────────────────────────────────────
        '/orders': [
            {
                intro: t('intro.orders_welcome'),
                position: 'floating',
                tooltipClass: 'introjs-center-tooltip'
            },
            {
                element: '.container',
                intro: t('intro.orders_list'),
                position: 'top'
            },
            {
                element: '.order-row',
                intro: t('intro.orders_row'),
                position: 'bottom'
            },
            {
                element: '#delete-order-btn',
                intro: t('intro.orders_delete'),
                position: 'bottom-right-aligned'
            },
            {
                element: '#edit-order-btn',
                intro: t('intro.orders_edit'),
                position: 'bottom-right-aligned'
            },
            {
                element: '#send-order',
                intro: t('intro.orders_send'),
                position: 'bottom-right-aligned'
            },
            {
                element: '#orders-history-nav-btn',
                intro: t('intro.orders_go_to_history'),
                position: 'bottom-right-aligned'
            }
        ],

        // ── Orders history (/orders/history) ────────────────────────────────
        '/orders/history': [
            {
                intro: t('intro.history_welcome'),
                position: 'floating',
                tooltipClass: 'introjs-center-tooltip'
            },
            {
                element: '.container',
                intro: t('intro.history_list'),
                position: 'top'
            },
            {
                element: '.order-row',
                intro: t('intro.history_row'),
                position: 'bottom'
            },
            {
                element: '.copy-order-btn',
                intro: t('intro.history_copy'),
                position: 'bottom-right-aligned'
            }
        ],

        // ── Employee panel (/user/employee-panel) ───────────────────────────
        '/user/employee-panel': [
            {
                intro: t('intro.employee_welcome'),
                position: 'floating',
                tooltipClass: 'introjs-center-tooltip'
            },
            {
                element: '.employees-container',
                intro: t('intro.employee_list'),
                position: 'top'
            },
            {
                element: '.action-btn-add',
                intro: t('intro.employee_add'),
                position: 'bottom-right-aligned'
            }
        ]
    };

    // ── Order detail (/orders/order/:id) ────────────────────────────────────
    if (/^\/orders\/order\/\d+$/.test(pathname)) {
        const hasPositions = document.querySelector('.order-table') !== null;

        if (hasPositions) {
            return [
                {
                    intro: t('intro.order_detail_welcome'),
                    position: 'floating',
                    tooltipClass: 'introjs-center-tooltip'
                },
                {
                    element: '#order-nav',
                    intro: t('intro.order_detail_nav'),
                    position: 'bottom'
                },
                {
                    element: '#new-order-button',
                    intro: t('intro.order_detail_new_pos'),
                    position: 'bottom'
                },
                {
                    element: '#edit-order-button',
                    intro: t('intro.order_detail_edit'),
                    position: 'bottom'
                },
                {
                    element: '#short-print-button',
                    intro: t('intro.order_detail_short_pdf'),
                    position: 'bottom-right-aligned'
                },
                {
                    element: '#print-button',
                    intro: t('intro.order_detail_pdf'),
                    position: 'bottom-right-aligned'
                },
                {
                    element: '#generate-excel-btn',
                    intro: t('intro.order_detail_excel'),
                    position: 'top'
                }
            ];
        } else {
            return [
                {
                    intro: t('intro.order_detail_welcome'),
                    position: 'floating',
                    tooltipClass: 'introjs-center-tooltip'
                },
                {
                    element: '#order-nav',
                    intro: t('intro.order_detail_nav'),
                    position: 'bottom'
                },
                {
                    element: '#new-order-button',
                    intro: t('intro.order_detail_empty'),
                    position: 'bottom'
                },
                {
                    element: '#edit-order-button',
                    intro: t('intro.order_detail_edit'),
                    position: 'bottom'
                }
            ];
        }
    }

    // ── New position (/orders/order/:id/new-position) ───────────────────────
    if (/^\/orders\/order\/\d+\/new-position\/?$/.test(pathname)) {
        return [
            {
                intro: t('intro.new_position_welcome'),
                position: 'floating',
                tooltipClass: 'introjs-center-tooltip'
            },
            {
                element: '#commission-input',
                intro: t('intro.new_position_commission'),
                position: 'bottom'
            },
            {
                element: '#department-select',
                intro: t('intro.new_position_department'),
                position: 'bottom'
            },
            {
                element: '#asortment-group-select',
                intro: t('intro.new_position_group'),
                position: 'bottom'
            },
            {
                element: '#dynamic-form',
                intro: t('intro.new_position_form'),
                position: 'top'
            },
            {
                element: '#show-button',
                intro: t('intro.new_position_save'),
                position: 'top'
            }
        ];
    }

    // ── Edit position (/position/:id/edit) ──────────────────────────────────
    if (/^\/position\/\d+\/edit$/.test(pathname)) {
        return [
            {
                intro: t('intro.edit_position_welcome'),
                position: 'floating',
                tooltipClass: 'introjs-center-tooltip'
            },
            {
                element: '#dynamic-form',
                intro: t('intro.edit_position_form'),
                position: 'top'
            },
            {
                element: '#reset-button',
                intro: t('intro.edit_position_reset'),
                position: 'bottom'
            },
            {
                element: '#show-button',
                intro: t('intro.edit_position_save'),
                position: 'top'
            }
        ];
    }

    return stepsConfig[pathname] || [];
}