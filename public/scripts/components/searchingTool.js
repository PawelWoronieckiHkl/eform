import { get } from './api_connector.js';

function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

function normalizeValue(value) {
    return String(value ?? '').trim().toLowerCase();
}

function toggleVisibility(element, shouldShow) {
    if (!element.dataset.searchOriginalDisplay) {
        element.dataset.searchOriginalDisplay = getComputedStyle(element).display;
    }
    element.style.display = shouldShow ? '' : 'none';
}

function buildSearchUI(mount, placeholder) {
    const wrapper = document.createElement('div');
    wrapper.className = 'orders-search';

    const icon = document.createElement('span');
    icon.className = 'orders-search__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="16.65" y1="16.65" x2="21" y2="21"></line></svg>`;

    const input = document.createElement('input');
    input.className = 'orders-search__input';
    input.type = 'search';
    input.placeholder = placeholder;
    input.setAttribute('aria-label', placeholder);

    const status = document.createElement('small');
    status.className = 'orders-search__status';

    wrapper.append(icon, input);
    mount.append(wrapper, status);
    return { input, status };
}

export function initSearchTool({
    mountSelector,
    placeholder = 'Szukaj...',
    // server mode
    apiUrl,
    tableBodySelector,
    mobileListSelector,
    renderTableRow,
    renderMobileCard,
    paginationSelector,
    debounceMs = 300,
    // DOM mode fallback
    itemSelector,
    getItemValue
}) {
    const mount = document.querySelector(mountSelector);
    if (!mount) return;

    const { input, status } = buildSearchUI(mount, placeholder);

    if (apiUrl) {
        const tableBody = tableBodySelector ? document.querySelector(tableBodySelector) : null;
        const mobileList = mobileListSelector ? document.querySelector(mobileListSelector) : null;
        const pagination = paginationSelector ? document.querySelector(paginationSelector) : null;

        const originalTableHTML = tableBody?.innerHTML ?? null;
        const originalMobileHTML = mobileList?.innerHTML ?? null;

        const doSearch = debounce(async (q) => {
            if (!q.trim()) {
                if (tableBody && originalTableHTML !== null) tableBody.innerHTML = originalTableHTML;
                if (mobileList && originalMobileHTML !== null) mobileList.innerHTML = originalMobileHTML;
                if (pagination) pagination.style.display = '';
                status.textContent = '';
                return;
            }

            input.disabled = true;
            try {
                const sent = mount.dataset.sent === 'true';
                const organization = mount.dataset.organization === 'true';
                let url = `${apiUrl}?q=${encodeURIComponent(q)}&sent=${sent}`;
                if (organization) url += '&organization=true';
                const urlParams = new URLSearchParams(window.location.search);
                const userIdent = urlParams.get('userIdent');
                if (userIdent) url += `&userIdent=${encodeURIComponent(userIdent)}`;
                const data = await get(url);
                const orders = data.orders ?? [];

                if (tableBody && renderTableRow) {
                    tableBody.innerHTML = orders.length
                        ? orders.map(renderTableRow).join('')
                        : `<tr><td colspan="99" class="text-center text-muted py-4">Brak wyników</td></tr>`;
                }
                if (mobileList && renderMobileCard) {
                    mobileList.innerHTML = orders.length
                        ? orders.map(renderMobileCard).join('')
                        : `<p class="text-center text-muted py-4">Brak wyników</p>`;
                }
                if (pagination) pagination.style.display = 'none';
                status.textContent = `Wyniki: ${orders.length}`;

                // Re-attach dropdown-active handlers for dynamically rendered dropdowns
                if (tableBody) {
                    tableBody.querySelectorAll('.order-row .dropdown').forEach(dropdown => {
                        const row = dropdown.closest('.order-row');
                        dropdown.addEventListener('show.bs.dropdown', () => { if (row) row.classList.add('dropdown-active'); });
                        dropdown.addEventListener('hide.bs.dropdown', () => { if (row) row.classList.remove('dropdown-active'); });
                    });
                }
            } catch (err) {
                console.error('Search error:', err);
                status.textContent = 'Błąd wyszukiwania';
            } finally {
                input.disabled = false;
                input.focus();
            }
        }, debounceMs);

        input.addEventListener('input', (e) => doSearch(e.target.value));
        return;
    }

    // DOM mode fallback
    if (!itemSelector || !getItemValue) return;
    const items = Array.from(document.querySelectorAll(itemSelector));
    if (items.length === 0) return;

    const applyFilter = () => {
        const query = normalizeValue(input.value);
        let visibleCount = 0;
        for (const item of items) {
            const value = normalizeValue(getItemValue(item));
            const match = query.length === 0 || value.includes(query);
            toggleVisibility(item, match);
            if (match) visibleCount++;
        }
        status.textContent = `Wyniki: ${visibleCount}/${items.length}`;
    };

    input.addEventListener('input', applyFilter);
    applyFilter();
}
