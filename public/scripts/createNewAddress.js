import { createElement } from "./components/htmlManipulator.js";

const MODAL_ID = "add-address-modal";

document.addEventListener("DOMContentLoaded", () => {
    const addDeliveryAddressBtn = document.getElementById("add-delivery-address-btn");
    const addMailBtn = document.getElementById("add-mail-btn");

    if (addDeliveryAddressBtn) {
        addDeliveryAddressBtn.addEventListener("click", (event) => {
            event.preventDefault();
            openAddAddressModal([
                ["name", "Nazwa adresu"],
                ["phone", "Telefon"],
                ["street", "Ulica"],
                ["city", "Miasto"],
                ["zip", "Kod pocztowy"],
                ["country", "Kraj"]
            ], '/address/add-delivery-address', {
                onSubmit: async (response) => {
                    await refreshUserAddressList(response?.data?.id);
                }
            });
        });
    }

    if (addMailBtn) {
        addMailBtn.addEventListener("click", (event) => {
            event.preventDefault();
            openAddAddressModal([["mail", "Email"]], '/address/add-mail-address');
        });
    }
});

function openAddAddressModal(inputsList = [], url, options = {}) {
    if (!Array.isArray(inputsList) || inputsList.length === 0) {
        throw new Error("inputsList musi być niepustą tablicą tupli [id, text].");
    }

    const existingModal = document.getElementById(MODAL_ID);
    if (existingModal) {
        existingModal.remove();
    }

    const preparedInputs = inputsList.map(normalizeInputConfig);
    const initialData = options.initialData || options.addressData || {};

    const dialog = createElement("dialog", {
        id: MODAL_ID,
        class: ["rounded-3", "border-0", "p-0"]
    }, document.body);

    const form = createElement("form", {
        method: "dialog",
        class: ["p-4", "d-flex", "flex-column", "gap-3"]
    }, dialog);

    createElement("h5", {
        text: options.title || "Dodaj nowy adres",
        class: ["mb-1"]
    }, form);

    const fieldsContainer = createElement("div", {
        class: ["d-flex", "flex-column", "gap-2"]
    }, form);

    preparedInputs.forEach((inputConfig) => {
        const wrapper = createElement("div", { class: ["mb-1"] }, fieldsContainer);

        createElement("label", {
            for: inputConfig.id,
            text: inputConfig.label,
            class: ["form-label", "mb-1"]
        }, wrapper);

        if (inputConfig.name === "country") {
            const countryInput = createElement("input", {
                type: "text",
                id: inputConfig.id,
                name: inputConfig.name,
                placeholder: inputConfig.placeholder,
                class: ["form-control"]
            }, wrapper);

            inputConfig._isCountrySelect = true;
        } else {
            const inputElement = createElement("input", {
                type: inputConfig.type,
                id: inputConfig.id,
                name: inputConfig.name,
                placeholder: inputConfig.placeholder,
                value: initialData[inputConfig.name] ?? inputConfig.value,
                class: ["form-control"]
            }, wrapper);

            if (inputConfig.required) {
                inputElement.required = true;
            }
        }
    });

    const actions = createElement("div", {
        class: ["d-flex", "justify-content-end", "gap-2", "pt-2"]
    }, form);

    createElement("button", {
        type: "button",
        text: options.cancelLabel || "Anuluj",
        class: ["btn", "btn-outline-secondary"],
        onclick: () => {
            dialog.close("cancel");
            dialog.remove();
            if (typeof options.onCancel === "function") {
                options.onCancel();
            }
        }
    }, actions);

    createElement("button", {
        type: "button",
        text: options.submitLabel || "Zapisz",
        class: ["btn", "btn-success"],
        onclick: async () => {
            const payload = {};

            for (const inputConfig of preparedInputs) {
                if (inputConfig._isCountrySelect) {
                    const codeInput = document.getElementById(inputConfig.id + "_code");
                    payload[inputConfig.name] = codeInput ? codeInput.value.trim() : "";
                    continue;
                }

                const inputElement = document.getElementById(inputConfig.id);
                if (!inputElement) {
                    continue;
                }

                const value = inputElement.value.trim();

                if (inputConfig.required && !value) {
                    inputElement.focus();
                    inputElement.reportValidity();
                    return;
                }

                if (value && !inputElement.checkValidity()) {
                    inputElement.focus();
                    inputElement.reportValidity();
                    return;
                }

                payload[inputConfig.name] = value;
            }

            try {
                const response = await sendAddressData(url, payload, options.requestMethod || "POST");
                if (typeof options.onSubmit === "function") {
                    options.onSubmit(response, payload);
                }
                dialog.close("submit");
                dialog.remove();
            } catch (error) {
                console.error("Błąd podczas zapisu adresu:", error);
            }
        }
    }, actions);

    dialog.addEventListener("close", () => {
        if (dialog.isConnected) {
            dialog.remove();
        }
    });

    if (typeof dialog.showModal === "function") {
        dialog.showModal();
    } else {
        dialog.setAttribute("open", "");
    }

    // Initialize countrySelect on country fields after dialog is in the DOM
    preparedInputs.forEach((inputConfig) => {
        if (inputConfig._isCountrySelect && typeof $ !== "undefined" && $.fn.countrySelect) {
            const $el = $(`#${inputConfig.id}`);
            const initCountry = initialData[inputConfig.name] || "pl";
            $el.countrySelect({
                preferredCountries: ["pl", "de", "gb", "nl", "fr"],
                defaultCountry: initCountry.length === 2 ? initCountry.toLowerCase() : "pl"
            });
        }
    });

    return dialog;
}

function normalizeInputConfig(input) {
    if (Array.isArray(input) && input.length >= 2) {
        const rawName = String(input[0] ?? "").trim();
        const label = String(input[1] ?? "").trim();

        if (!rawName) {
            throw new Error("Tuple inputu musi zawierać poprawne id.");
        }

        if (!label) {
            throw new Error(`Tuple '${rawName}' musi zawierać text etykiety.`);
        }

        const extraConfig = input[2] && typeof input[2] === "object" ? input[2] : {};

        const isEmailField = ["mail", "email"].includes(rawName.toLowerCase());

        return {
            name: rawName,
            id: `${toSafeId(rawName)}-input`,
            label,
            type: extraConfig.type || (isEmailField ? "email" : "text"),
            placeholder: extraConfig.placeholder || (isEmailField ? "nazwa@domena.pl" : ""),
            required: Boolean(extraConfig.required),
            value: extraConfig.value || ""
        };
    }

    throw new Error("Każdy element inputsList musi być tuplem [id, text].");
}

function toSafeId(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

async function refreshUserAddressList(selectedAddressId = null) {
    const addressSelect = document.getElementById("address-select");
    if (!addressSelect) {
        return;
    }

    const response = await fetch('/address/list', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Blad podczas odswiezania adresow: ${response.statusText}`);
    }

    const result = await response.json();
    const addresses = Array.isArray(result.addresses) ? result.addresses : [];

    addressSelect.innerHTML = '';

    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = 'Wybierz adres dostawy';
    placeholderOption.disabled = true;
    addressSelect.appendChild(placeholderOption);

    addresses.forEach((address) => {
        const option = document.createElement('option');
        option.value = String(address.id);
        option.textContent = `${address.name}  (${address.street} ${address.city} ${address.zip} ${address.country})`;

        if (selectedAddressId && String(address.id) === String(selectedAddressId)) {
            option.selected = true;
        }

        addressSelect.appendChild(option);
    });

    if (!selectedAddressId) {
        placeholderOption.selected = true;
    }

    addressSelect.dispatchEvent(new Event('change'));
}

async function sendAddressData(url, data, method = "POST") {
    const response = await fetch(url, {
        method,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error(`Błąd sieci: ${response.statusText}`);
    }
    return response.json();
}

export { openAddAddressModal, sendAddressData };