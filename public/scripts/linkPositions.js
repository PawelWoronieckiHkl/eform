/**
 * linkPositions.js — "Hang together" position linking feature.
 *
 * Each row has a chain button (.link-pos-toggle-btn).
 * Clicking it selects/deselects the row for linking.
 * A persistent bottom toolbar shows the selection state
 * and exposes Link / Unlink / Cancel actions.
 */
(function () {
    const bar = document.getElementById('link-positions-bar');
    if (!bar) return;

    const orderId   = bar.dataset.orderId;
    const countEl   = document.getElementById('link-count-label');
    const linkBtn   = document.getElementById('link-selected-btn');
    const unlinkBtn = document.getElementById('unlink-selected-btn');
    const clearBtn  = document.getElementById('clear-link-selection-btn');

    // selected position IDs
    const selected = new Set();

    // ── color palette for link groups ────────────────────────────────
    const palette = ['#e67e22','#2980b9','#27ae60','#8e44ad','#c0392b','#16a085','#d35400','#1abc9c'];
    const groupColorMap = new Map();
    let colorIdx = 0;
    function colorFor(uuid) {
        if (!uuid) return '#adb5bd';
        if (!groupColorMap.has(uuid)) groupColorMap.set(uuid, palette[colorIdx++ % palette.length]);
        return groupColorMap.get(uuid);
    }

    // ── helper: hex → rgba string ─────────────────────────────────────
    function hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    // ── initial coloring of already-linked buttons and their rows ─────
    document.querySelectorAll('.link-pos-toggle-btn[data-link-group]').forEach(btn => {
        const g = btn.dataset.linkGroup;
        if (g) {
            const color = colorFor(g);
            btn.style.setProperty('--link-color', color);
            btn.classList.add('has-link-group');
            const row = rowOf(btn);
            if (row) {
                row.classList.add('link-group-row');
                row.style.setProperty('--link-group-color', color);
                row.style.setProperty('--link-group-color-bg', hexToRgba(color, 0.07));
            }
        }
    });

    // ── row helper ────────────────────────────────────────────────────
    function rowOf(btn) {
        return btn.closest('tr') || btn.closest('.mobile-item-card');
    }

    // ── sync bar state ────────────────────────────────────────────────
    function syncBar() {
        const n = selected.size;
        countEl.textContent = n;

        const anyLinked = [...selected].some(id => {
            const btn = document.querySelector(`.link-pos-toggle-btn[data-id="${id}"]`);
            return btn && btn.dataset.linkGroup;
        });

        linkBtn.disabled    = n < 2;
        unlinkBtn.disabled  = n < 1 || !anyLinked;

        if (n > 0) {
            bar.classList.add('is-visible');
        } else {
            bar.classList.remove('is-visible');
        }
    }

    // ── toggle a single button ────────────────────────────────────────
    function toggleBtn(btn) {
        const id = btn.dataset.id;
        if (!id) return;

        if (selected.has(id)) {
            selected.delete(id);
            btn.classList.remove('active');
            rowOf(btn)?.classList.remove('link-row-selected');
        } else {
            selected.add(id);
            btn.classList.add('active');
            rowOf(btn)?.classList.add('link-row-selected');
        }
        syncBar();
    }

    // ── clear all selections ──────────────────────────────────────────
    function clearAll() {
        selected.clear();
        document.querySelectorAll('.link-pos-toggle-btn.active').forEach(btn => {
            btn.classList.remove('active');
            rowOf(btn)?.classList.remove('link-row-selected');
        });
        syncBar();
    }

    // ── bind click directly to each toggle button ────────────────────
    // (delegated document listener won't work because the button has
    //  onclick="event.stopPropagation()" to prevent row navigation)
    document.querySelectorAll('.link-pos-toggle-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleBtn(this);
        });
    });

    clearBtn.addEventListener('click', clearAll);

    // ── API call ──────────────────────────────────────────────────────
    async function patchLink(unlink) {
        const ids = [...selected].map(Number);
        if (!unlink && ids.length < 2) return;
        if (ids.length < 1) return;

        linkBtn.disabled = unlinkBtn.disabled = true;

        try {
            const res = await fetch(`/orders/order/${orderId}/link-positions`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ positionIds: ids, unlink: !!unlink })
            });
            const data = await res.json();
            if (data.success) {
                location.reload();
            } else {
                alert(data.message || 'Błąd');
                syncBar();
            }
        } catch (err) {
            console.error(err);
            syncBar();
        }
    }

    linkBtn.addEventListener('click',   () => patchLink(false));
    unlinkBtn.addEventListener('click', () => patchLink(true));
})();
