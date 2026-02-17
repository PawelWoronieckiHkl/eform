document.addEventListener('DOMContentLoaded', () => {
    const viewMode = document.getElementById('view-mode');
    const editForm = document.getElementById('edit-employee-form');
    const editModeBtn = document.getElementById('edit-mode-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const changePasswordToggle = document.getElementById('change-password-toggle');
    const passwordFields = document.getElementById('password-fields');
    const passwordInput = document.getElementById('password');
    const passwordConfirmInput = document.getElementById('password-confirm');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const togglePasswordConfirmBtn = document.getElementById('toggle-password-confirm');
    const passwordIcon = document.getElementById('password-icon');
    const passwordConfirmIcon = document.getElementById('password-confirm-icon');
    const matchMessage = document.getElementById('password-match-message');

    
    editModeBtn.addEventListener('click', () => {
        viewMode.style.display = 'none';
        editForm.style.display = 'block';
    });

    
    cancelEditBtn.addEventListener('click', () => {
        editForm.style.display = 'none';
        viewMode.style.display = 'block';

        
        changePasswordToggle.checked = false;
        passwordFields.style.display = 'none';
        passwordInput.value = '';
        passwordConfirmInput.value = '';
        passwordInput.required = false;
        passwordConfirmInput.required = false;
        matchMessage.textContent = '';
    });

    
    changePasswordToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            passwordFields.style.display = 'block';
            passwordInput.required = true;
            passwordConfirmInput.required = true;
        } else {
            passwordFields.style.display = 'none';
            passwordInput.required = false;
            passwordConfirmInput.required = false;
            passwordInput.value = '';
            passwordConfirmInput.value = '';
            matchMessage.textContent = '';
        }
    });

    
    togglePasswordBtn.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        passwordIcon.classList.toggle('fa-eye');
        passwordIcon.classList.toggle('fa-eye-slash');
    });

    togglePasswordConfirmBtn.addEventListener('click', () => {
        const type = passwordConfirmInput.type === 'password' ? 'text' : 'password';
        passwordConfirmInput.type = type;
        passwordConfirmIcon.classList.toggle('fa-eye');
        passwordConfirmIcon.classList.toggle('fa-eye-slash');
    });

    
    function checkPasswordMatch() {
        if (!changePasswordToggle.checked) return true;

        const password = passwordInput.value;
        const confirmPassword = passwordConfirmInput.value;

        if (confirmPassword === '') {
            matchMessage.textContent = '';
            matchMessage.className = 'form-text';
            return true;
        }

        if (password === confirmPassword) {
            matchMessage.textContent = '✓ Hasła są zgodne';
            matchMessage.className = 'form-text text-success';
            return true;
        } else {
            matchMessage.textContent = '✗ Hasła nie są zgodne';
            matchMessage.className = 'form-text text-danger';
            return false;
        }
    }

    passwordInput.addEventListener('input', checkPasswordMatch);
    passwordConfirmInput.addEventListener('input', checkPasswordMatch);

    
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        
        if (changePasswordToggle.checked && !checkPasswordMatch()) {
            alert('Hasła nie są zgodne!');
            return;
        }

        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Zapisuję...';

        const formData = {
            name: document.getElementById('name').value.trim(),
            surname: document.getElementById('surname').value.trim(),
            login: document.getElementById('login').value.trim(),
            phone: document.getElementById('phone').value.trim(),
        };

        
        if (changePasswordToggle.checked) {
            formData.password = passwordInput.value;
        }

        try {
            const employeeId = window.location.pathname.split('/').pop();
            const response = await fetch(`/user/employee/edit/${employeeId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message || 'Pracownik został zaktualizowany!');
                window.location.reload();
            } else {
                alert(result.message || 'Wystąpił błąd podczas aktualizacji pracownika');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Zapisz zmiany';
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Wystąpił błąd podczas zapisywania zmian');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Zapisz zmiany';
        }
    });
});
