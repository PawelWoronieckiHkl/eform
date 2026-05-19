import { showToast } from "./components/toast.js";

const form = document.getElementById('add-employee-form');
const submitBtn = document.getElementById('submit-btn');
const togglePasswordBtn = document.getElementById('toggle-password');
const passwordInput = document.getElementById('password');
const passwordIcon = document.getElementById('password-icon');


togglePasswordBtn.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);

    if (type === 'text') {
        passwordIcon.classList.remove('fa-eye');
        passwordIcon.classList.add('fa-eye-slash');
    } else {
        passwordIcon.classList.remove('fa-eye-slash');
        passwordIcon.classList.add('fa-eye');
    }
});


form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Uprawnienia — checkbox: checked = "1", unchecked = "0"
    data.can_send_orders = document.getElementById('can_send_orders').checked ? '1' : '0';
    data.can_see_prices = document.getElementById('can_see_prices').checked ? '1' : '0';
    data.can_see_all_orders = document.getElementById('can_see_all_orders').checked ? '1' : '0';

    
    if (!data.name || !data.surname || !data.login || !data.password) {
        showToast('error', 'Wszystkie wymagane pola muszą być wypełnione');
        return;
    }

    if (data.password.length < 6) {
        showToast('error', 'Hasło musi mieć minimum 6 znaków');
        return;
    }

    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Zapisywanie...';

    try {
        const response = await fetch('/user/employee/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        console.log('Add employee response:', result);
        if (result.success) {
            showToast('success', result.message || 'Pracownik został dodany');

            
            setTimeout(() => {
                window.location.href = result.redirect || '/user/employee-panel';
            }, 500);
        } else {
            showToast('error', result.message || 'Błąd podczas dodawania pracownika');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Zapisz';
        }
    } catch (error) {
        console.error('Error adding employee:', error);
        showToast('error', 'Błąd podczas dodawania pracownika');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Zapisz';
    }
});


const nameInput = document.getElementById('name');
const surnameInput = document.getElementById('surname');
const loginInput = document.getElementById('login');

[nameInput, surnameInput, loginInput, passwordInput].forEach(input => {
    input.addEventListener('input', () => {
        if (input.value.trim() === '') {
            input.classList.add('is-invalid');
        } else {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
        }
    });
});

passwordInput.addEventListener('input', () => {
    if (passwordInput.value.length < 6 && passwordInput.value.length > 0) {
        passwordInput.classList.add('is-invalid');
        passwordInput.classList.remove('is-valid');
    } else if (passwordInput.value.length >= 6) {
        passwordInput.classList.remove('is-invalid');
        passwordInput.classList.add('is-valid');
    }
});
