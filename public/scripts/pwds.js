(function () {
    var searchInput = document.getElementById('pwd-search');
    var rows = document.querySelectorAll('.pwd-row');
    var countEl = document.getElementById('pwd-count');

    function updateCount() {
        var visible = document.querySelectorAll('.pwd-row:not([style*="display: none"])').length;
        countEl.textContent = visible + ' / ' + rows.length;
    }
    updateCount();

    if (searchInput) {
        searchInput.addEventListener('input', function () {
            var q = this.value.toLowerCase().trim();
            rows.forEach(function (row) {
                var ident = row.querySelector('.pwd-ident').textContent.toLowerCase();
                row.style.display = ident.includes(q) ? '' : 'none';
            });
            updateCount();
        });
    }

    document.querySelectorAll('.pwd-toggle-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var td = this.closest('td');
            var span = td.querySelector('.pwd-value');
            var hidden = td.querySelector('.pwd-hidden');
            var revealed = span.getAttribute('data-revealed') === 'true';
            if (revealed) {
                span.textContent = '••••••••';
                span.setAttribute('data-revealed', 'false');
                this.textContent = window.t('pwds.show') || 'Pokaż';
            } else {
                span.textContent = hidden.value;
                span.setAttribute('data-revealed', 'true');
                this.textContent = window.t('pwds.hide') || 'Ukryj';
            }
        });
    });

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }

    function copyToClipboard(text) {
        var msg = window.t('pwds.copied') || 'Skopiowano do schowka';
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                if (typeof toastr !== 'undefined') toastr.success(msg);
            }).catch(function () {
                fallbackCopy(text);
                if (typeof toastr !== 'undefined') toastr.success(msg);
            });
        } else {
            fallbackCopy(text);
            if (typeof toastr !== 'undefined') toastr.success(msg);
        }
    }

    document.querySelectorAll('.copy-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var td = this.closest('td');
            var type = this.getAttribute('data-copy');
            var text;
            if (type === 'pin') {
                text = td.querySelector('.pwd-pin').textContent.trim();
            } else {
                text = td.querySelector('.pwd-hidden').value;
            }
            copyToClipboard(text);
        });
    });
})();
