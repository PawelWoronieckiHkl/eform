

import { showToast } from "./toast.js";


export function createElement(tag, attributes = {}, parent = null) {
    const element = document.createElement(tag);
    const changedElem = manipulateElem(element, attributes, parent)
    return changedElem;
}
export function editElementById(tag, attributes = {}, parent = null) {
    const element = document.getElementById(tag)
    const changedElem = manipulateElem(element, attributes, parent)
    return changedElem;
}

function manipulateElem(element, attributes = {}, parent = null) {
    for (const [key, value] of Object.entries(attributes)) {
        if (key === 'text') {
            element.textContent = value;
        }
        else if (key === 'html') {
            element.innerHTML = value;
        }
        else if (key === 'class') {
            for (const className of value) {
                element.classList.add(className);
            }
        }
        else if (key === 'style') {
            if (typeof value === 'string') {
                element.style.cssText = value;
            }
            else if (typeof value === 'object' && !Array.isArray(value)) {
                Object.assign(element.style, value);
            } else {
                console.warn('Niepoprawny typ atrybutu "style". Powinien być string lub obiekt, nie tablica.');
            }
        }
        else if (key === 'type') {
            element.type = value;
        }
        else if (key === 'value') {
            element.value = value;
        }
        else if (key === 'dataset') {
            for (const [dataKey, dataValue] of Object.entries(value)) {
                element.dataset[dataKey] = dataValue;
            }
        }
        else if (key.startsWith('on')) {
            const eventType = key.slice(2).toLowerCase();
            element.addEventListener(eventType, value);
        }
        else if (key === 'checked') {
            element.checked = value;
        }
        else if (key === 'disabled') {
            element.disabled = value;
        }
        else if (key === 'placeholder') {
            element.placeholder = value;
        }
        else if (key === 'src') {
            element.src = value;
        }
        else if (key === 'href') {
            element.href = value;  // tu był błąd – brak przypisania!
        }
        else {
            element.setAttribute(key, value);
        }
    }
    if (parent) {
        parent.appendChild(element);
    }
    return element;
};


export function createInfoDialog({
    title = "",
    message = "",
    buttons = [
        { label: "OK", action: () => { }, className: "btn btn-secondary", id: "ok-btn", enter: false }
    ],
    parent = null,
    input = null,
    checkbox = null
} = {}) {
    if (!parent) throw new Error("Parent element is required!");

    const dialog = createElement("dialog", { id: "delete-dialog" }, parent);

    if (title) {
        createElement("h3", { class: ["text-center"], id: "dialog-title", text: title }, dialog);
    }

    if (input) {
        const inputDiv = createElement('div', { id: 'diag-input-container', class: ['diag-input-container'] }, dialog)
        createElement('label', { for: 'dialog-input', class: ['dialog-label', 'mb-1'], text: input.name }, inputDiv)
        createElement('input', { type: input.type, class: ['dialog-inputs'], id: input.id }, inputDiv)
    }
    if (checkbox) {
        const checkboxDiv = createElement('div', { id: 'diag-checkbox-container', class: ['mt-4', 'ms-3'] }, dialog)
        createElement('input', { type: 'checkbox', class: ['dialog-checkbox', 'form-check-input', 'p-1'], id: checkbox.id }, checkboxDiv)
        createElement('label', { for: 'dialog-checkbox', class: ['dialog-checbox-label', 'mb-1', 'ms-2'], text: checkbox.name }, checkboxDiv)


    }
    createElement("p", { class: ["text-center"], html: message }, dialog);

    createElement("div", { class: ["alert"], id: "status-info" }, dialog);

    const btnContainer = createElement("div", { class: ["confirmattion-buttons"] }, dialog);

    const buttonElements = [];
    buttons.forEach(({ label, action, className = "", id = "", enter = false }) => {
        const btn = createElement("button", {
            text: label,
            class: className.split(" ").filter(Boolean),
            id: id,
            type: "button",
            onclick: (e) => {
                e.preventDefault();
                if (typeof action === "function") action();
            }
        }, btnContainer);
        btn.dataset.enter = enter ? "true" : "false";
        buttonElements.push(btn);
    });

    // Obsługa klawisza Enter - wywołuje kliknięcie przycisku z enter: true
    const enterButton = buttonElements.find(btn => btn.dataset.enter === "true");
    if (enterButton) {
        dialog.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                enterButton.click();
            }
        });
    }

    if (typeof dialog.showModal === "function") {
        dialog.showModal();
    }

    return { buttons: buttonElements, diag: dialog };
}

export function isEnabled(formula, values, paramName) {

    let isEnabled = false;
    try {
        isEnabled = window.FormulaHandler.evaluateFormula(
            formula,
            values,
            "paramdict",
            paramName
        );
        // console.log(formula, isEnabled)
    }
    catch (error) {

        console.log('mamy error')

        showToast('error', `Error:  ${error.message}`)
    }
    return isEnabled;
}

