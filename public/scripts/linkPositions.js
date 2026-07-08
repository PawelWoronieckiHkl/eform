/**
 * linkPositions.js — "Hang together" position linking.
 *
 * A single toolbar button opens a folder-style manager (like iPhone
 * app folders): every position is a draggable card, and you drop cards
 * into colored group containers so linked positions are grouped.
 *
 * Works with drag-and-drop (desktop) AND tap-to-select + "move here"
 * (touch / accessibility). Saving persists one link_group UUID per
 * container with 2+ cards; everything else is unlinked.
 *
 * In the order preview, positions that already belong to a link group
 * get a colored stripe/tint + a "🔗 group N" chip so it is obvious they
 * hang together.
 */
(function () {
    'use strict';

    // ── color palette (same index = same visual group) ─────────────────
    const palette = ['#e67e22', '#2980b9', '#27ae60', '#8e44ad', '#c0392b', '#16a085', '#d35400', '#2c3e50'];
    function hexToRgba(hex, a) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${a})`;
    }
    function escapeHtml(s) {
        const d = document.createElement('div');
        d.textContent = String(s);
        return d.innerHTML;
    }
    function i18n(key, fallback) {
        return (window.__linkI18n && window.__linkI18n[key]) || fallback;
    }

    // ── 1. colorize already-linked rows in the preview ─────────────────
    function paintPreview() {
        const positions = window.__orderPositions || [];
        const groupOrder = [];
        positions.forEach(p => {
            if (p.linkGroup && !groupOrder.includes(p.linkGroup)) groupOrder.push(p.linkGroup);
        });
        const colorOf = uuid => palette[groupOrder.indexOf(uuid) % palette.length];
        const numberOf = uuid => groupOrder.indexOf(uuid) + 1;

        positions.forEach(p => {
            if (!p.linkGroup) return;
            const color = colorOf(p.linkGroup);
            const num = numberOf(p.linkGroup);

            document.querySelectorAll(`[data-id="${p.id}"][data-link-group]`).forEach(row => {
                if (!row.matches('tr, .mobile-item-card')) return;
                row.classList.add('link-group-row');
                row.style.setProperty('--link-group-color', color);
                row.style.setProperty('--link-group-color-bg', hexToRgba(color, 0.08));

                const anchor = row.querySelector('.order-idx') || row.querySelector('.mobile-item-number');
                if (anchor && !anchor.querySelector('.link-group-chip')) {
                    const chip = document.createElement('span');
                    chip.className = 'link-group-chip';
                    chip.style.background = color;
                    chip.title = i18n('groupLabel', 'Grupa');
                    chip.textContent = '🔗' + num;
                    anchor.appendChild(chip);
                }
            });
        });
    }

    // ── 2. folder-style manager modal ──────────────────────────────────
    const dialog = document.getElementById('link-manager-dialog');
    const openBtns = document.querySelectorAll('.open-link-manager-btn');
    if (!dialog || !openBtns.length) {
        paintPreview();
        return;
    }

    const orderId = dialog.dataset.orderId;
    const groupsWrap = dialog.querySelector('#lm-groups');
    const unlinkedZone = dialog.querySelector('#lm-unlinked');
    const addGroupBtn = dialog.querySelector('#lm-add-group');
    const saveBtn = dialog.querySelector('#lm-save');
    const tpl = dialog.querySelector('#lm-group-template');

    let dragged = null;

    function makeCard(p, idx) {
        const card = document.createElement('div');
        card.className = 'lm-card';
        card.draggable = true;
        card.dataset.id = p.id;
        card.innerHTML =
            `<span class="lm-card-num">#${idx + 1}</span>` +
            `<span class="lm-card-body">` +
                `<span class="lm-card-name">${escapeHtml(p.name || '—')}</span>` +
                (p.group ? `<span class="lm-card-group">${escapeHtml(p.group)}</span>` : '') +
            `</span>`;

        card.addEventListener('click', () => card.classList.toggle('selected'));
        card.addEventListener('dragstart', e => {
            dragged = card;
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        card.addEventListener('dragend', () => {
            dragged = null;
            card.classList.remove('dragging');
            renumberGroups();
        });
        return card;
    }

    function selectedCards() {
        return [...dialog.querySelectorAll('.lm-card.selected')];
    }
    function clearSelection() {
        dialog.querySelectorAll('.lm-card.selected').forEach(c => c.classList.remove('selected'));
    }
    function moveInto(zone, cards) {
        cards.forEach(c => zone.appendChild(c));
        clearSelection();
        renumberGroups();
    }

    function wireDropZone(zone) {
        zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const cards = dragged
                ? (dragged.classList.contains('selected') ? selectedCards() : [dragged])
                : selectedCards();
            moveInto(zone, cards);
        });
    }

    function addGroup(color) {
        const node = tpl.content.firstElementChild.cloneNode(true);
        const zone = node.querySelector('.lm-cards');
        const c = color || palette[groupsWrap.children.length % palette.length];
        node.style.setProperty('--lm-group-color', c);
        wireDropZone(zone);
        node.querySelector('.lm-move-here').addEventListener('click', () => {
            const sel = selectedCards();
            if (sel.length) moveInto(zone, sel);
        });
        node.querySelector('.lm-zone-del').addEventListener('click', () => {
            moveInto(unlinkedZone, [...zone.children]);
            node.remove();
            renumberGroups();
        });
        groupsWrap.appendChild(node);
        renumberGroups();
        return zone;
    }

    function renumberGroups() {
        [...groupsWrap.children].forEach((g, i) => {
            const color = palette[i % palette.length];
            g.style.setProperty('--lm-group-color', color);
            const title = g.querySelector('.lm-zone-title');
            if (title) title.textContent = i18n('groupLabel', 'Grupa') + ' ' + (i + 1);
        });
    }

    function build() {
        groupsWrap.innerHTML = '';
        unlinkedZone.innerHTML = '';
        const positions = window.__orderPositions || [];

        const byGroup = new Map();
        positions.forEach((p, idx) => {
            if (p.linkGroup) {
                if (!byGroup.has(p.linkGroup)) byGroup.set(p.linkGroup, []);
                byGroup.get(p.linkGroup).push({ p, idx });
            }
        });

        byGroup.forEach(members => {
            if (members.length < 2) {
                members.forEach(m => unlinkedZone.appendChild(makeCard(m.p, m.idx)));
                return;
            }
            const zone = addGroup();
            members.forEach(m => zone.appendChild(makeCard(m.p, m.idx)));
        });

        positions.forEach((p, idx) => {
            if (!p.linkGroup) unlinkedZone.appendChild(makeCard(p, idx));
        });

        renumberGroups();
    }

    async function save() {
        const groups = [...groupsWrap.querySelectorAll('.lm-cards')]
            .map(z => [...z.querySelectorAll('.lm-card')].map(c => Number(c.dataset.id)))
            .filter(g => g.length >= 2);
        const allIds = (window.__orderPositions || []).map(p => Number(p.id));

        saveBtn.disabled = true;
        try {
            const res = await fetch(`/orders/order/${orderId}/link-groups`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ allIds, groups })
            });
            const data = await res.json();
            if (data.success) {
                location.reload();
            } else {
                alert(data.message || 'Błąd');
                saveBtn.disabled = false;
            }
        } catch (err) {
            console.error(err);
            saveBtn.disabled = false;
        }
    }

    wireDropZone(unlinkedZone);
    dialog.querySelector('.lm-unlinked-move').addEventListener('click', () => {
        const sel = selectedCards();
        if (sel.length) moveInto(unlinkedZone, sel);
    });
    addGroupBtn.addEventListener('click', () => addGroup());
    saveBtn.addEventListener('click', save);
    dialog.querySelectorAll('[data-close]').forEach(b =>
        b.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });

    openBtns.forEach(btn => btn.addEventListener('click', () => {
        build();
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
    }));

    paintPreview();
})();
