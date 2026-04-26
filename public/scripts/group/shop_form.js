(function () {
    'use strict';

    // Toggle password visibility
    const toggle = document.getElementById('toggle-password');
    const input = document.getElementById('password');
    toggle?.addEventListener('click', () => {
        input.type = input.type === 'password' ? 'text' : 'password';
    });

    // Generate random password
    const genBtn = document.getElementById('gen-password');
    const genHint = document.getElementById('gen-hint');
    if (genBtn) {
        genBtn.addEventListener('click', () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            const arr = new Uint8Array(5);
            crypto.getRandomValues(arr);
            const pwd = Array.from(arr, b => chars[b % chars.length]).join('');
            input.value = pwd;
            input.type = 'text';
            input.classList.remove('is-invalid');
            if (genHint) genHint.textContent = '→ ' + pwd;
        });
    }

    // Bootstrap client-side validation
    const form = document.querySelector('form[novalidate]');
    form?.addEventListener('submit', e => {
        if (!form.checkValidity()) {
            e.preventDefault();
            e.stopPropagation();
        }
        form.classList.add('was-validated');
    });
}());
