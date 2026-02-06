import { logFunctionName, searchForParameter } from './formTools.js';
import { createDialog } from './dialogUtils_copy.js'
import { isEnabled, createElement } from '../components/htmlManipulator.js';
import { SourceWindow } from './slope.js';
import { attachmentBehaviorOnClick, changeAttachmentAppearance } from './attachment.js';

export function processCommissionInput(labelValue = false) {
    logFunctionName('processCommissionInput')

    const hiddenClass = document.querySelector('.asortment-container');
    hiddenClass.style.setProperty('display', 'block', 'important');
}

export async function getPossibleValues(dictValues, values) {
    logFunctionName('getPossibleValues')
    const possibleElements = [];

    if (!dictValues || dictValues.length === 0) {
        return { possibleElements };
    }

    for (let i = 0; i < dictValues.length; i++) {
        let row = dictValues[i];
        if (row.VALUE == '-' || row.VALUE == '=' || row.VALUE == '') { continue };
        if (! await isEnabled(row.ENABLE, values)) { continue }
        if (row.VALUE == "<NULL>") row.VALUE = null;
        if (row.DESCRIPTION == "<NULL>") row.DESCRIPTION - null;
        let row_number = row.ROW_NUM;
        possibleElements.push(row);
    }

    return { possibleElements };
}

export function createInputField(param, options, groupNumber, filters, allOptions, values, attrs = [], parrent = null) {

    logFunctionName('createInputField')

    options = options.possibleElements;

    if (param.SOURCE == param.NAME) {
        createElement('label', { text: `${param.DESCRIPTION} ` }, parrent);

        let btn = createElement("button", {
            class: ["button"],
            id: param.NAME,
            type: 'button',
            html: `${t('Uzupełnij')}`,
            onclick: async function () {
                await param.modal.show()
            }
        }, parrent);
        parrent.appendChild(createElement('br'));
        return btn;
    }

    if (param.GRAPHICS == 'true' && Array.isArray(options) && (param.TYPE != 'link')) {
        createElement('label', { text: `${param.DESCRIPTION} ` }, parrent);
        let btn = createElement("button", {
            class: ["button"],
            id: param.NAME,
            type: 'button',
            text: param.DEFAULT != '<NULL>'
                ? (param.DEFAULT == '<NONE>'
                    ? ` ${options.find(val => val.VALUE == param.DEFAULT)?.DESCRIPTION}`
                    : `${options.find(val => val.VALUE == param.DEFAULT)?.VALUE}-${options.find(val => val.VALUE == param.DEFAULT)?.DESCRIPTION}`)
                : `${t('form.check_word')}`
        }, parrent);

        // Użyj addEventListener zamiast onclick, aby umożliwić zarządzanie handlerami
        btn.addEventListener('click', function () {
            createDialog(param, options, groupNumber, filters[param.NAME], attrs);
        });

        parrent.appendChild(createElement('br'));
        return btn;
    }
    if (allOptions?.length ?? 0 > 1) {
        createElement('label', { text: `${param.DESCRIPTION} ` }, parrent);

        let select = createElement("select", { class: ["select"] }, parrent);

        select.appendChild(new Option(t('form.check_option'), ""));

        // Deduplikacja opcji na podstawie ROW_NUM + VALUE
        const seenOptions = new Set();
        for (let idx = 0; idx < allOptions.length; idx++) {
            let row = allOptions[idx];
            const optionKey = `${row.ROW_NUM}-${row.VALUE}`;

            // Pomiń duplikaty
            if (seenOptions.has(optionKey)) {
                continue;
            }
            seenOptions.add(optionKey);

            let optionText;

            if (row?.ALIAS) {
                optionText = `${row.ALIAS} ${row.ALIAS_DESCRIPTION}`;
            }
            else {
                optionText = `${row.VALUE} ${row.DESCRIPTION}`;
            }
            let option = new Option(optionText || row.VALUE, row.VALUE);
            option.id = `${row.ROW_NUM}-${param.NAME}`;
            if (!isEnabled(row.ENABLE, values)) {
                option.style.display = 'none'
            }
            select.appendChild(option);
        }
        parrent.appendChild(createElement('br'));
        return select;
    }

    let input = createElement("input", { class: ["input-form"] }, null);

    if (param.TYPE === "numeric") {
        input.type = "number";
        input.addEventListener('input', function (event) {
            if (isNaN(this.value)) {
                this.value = this.value.replace(/[^0-9.-]/g, '');
            }
        });
    }
    else {
        input.type = "text";
    }

    if (param.FORMULA != "<NULL>") {
        input.type = "text";
    }
    if (param.TYPE === 'link') {
        const linkBtn = createElement("a", {
            href: param.URL || "#",
            text: param.DESCRIPTION || "Otwórz",
            class: ["link-btn", "tiny-link-btn"],
            value: param.NAME,
            rel: "noopener noreferrer"
        }, parrent);

        setTimeout(() => {
            const parentDiv = document.querySelector(`.${param.NAME}-select-area`);
            if (parentDiv) {
                parentDiv.classList.remove(`${param.NAME}-select-area`);
                parentDiv.classList.add('link-area');
            }
        }, 0);
        createElement('label', { text: `${param.DESCRIPTION} ` }, parrent);
        parrent.appendChild(createElement('br'));
        return linkBtn;
    }
    if (param.TYPE === 'file') {
        param.REQUIRED = false;
        input.classList.remove("input-form");
        input.classList.add("file-input");
        input.style.display = 'none';
        const attachmentContainer = document.getElementById('attachment-container');
        const attachmentsLabel = document.querySelector('.attachment-label');
        console.log(attachmentsLabel.textContent, 'labelka załączników')
        if (attachmentsLabel.textContent == '') {
            attachmentsLabel.textContent = t('form.attachments_label')
        }
        const attachmentItemWrapper = createElement('div', {
            class: ['attachment-item-wrapper']
        }, attachmentContainer);


        const fileIcon = createElement('button', {
            type: 'button',
            class: ['file-upload-icon', 'has-tooltip'],
            title: 'Kliknij aby wybrać plik',
        }, attachmentItemWrapper);

        const attachmentImage = createElement('img', { src: '/img/attachment.png', class: ['icon'], alt: 'Załącznik', width: '24', height: '24' }, fileIcon);

        fileIcon.dataset.tooltip = `${param.DESCRIPTION}`
        fileIcon.addEventListener('click', (e) => {
            e.preventDefault();
            input.click();
        });

        // Przycisk do usuwania załącznika
        const removeBtn = createElement('button', {
            type: 'button',
            class: ['file-remove-btn'],
            text: '✕',
            title: 'Usuń załącznik'
        }, attachmentItemWrapper);

        removeBtn.style.display = 'none';
        removeBtn.addEventListener('click', (e) => {
            attachmentBehaviorOnClick(input, attachmentImage, fileIcon, removeBtn, param, e);
        });

        input.type = "file";
        input.name = param.NAME;  // ✅ Ustawienie atrybutu name
        console.log(input, 'input załącznik')
        input.addEventListener('change', function () {
            changeAttachmentAppearance(input, attachmentImage, fileIcon, removeBtn, param, 10)
        });

        attachmentItemWrapper.appendChild(input);
        return input
    }

    createElement('label', { text: `${param.DESCRIPTION} ` }, parrent);
    parrent.appendChild(input);
    parrent.appendChild(createElement('br'));
    return input;


}

export function fillFields(displayValues, inputs, values) {
    //    console.log('fillFields')
    for (let input of Object.values(inputs)) {
        const tag = input.tagName
        const labelData = displayValues.get(input.name)
        // console.log(input.name, labelData)
        if (values[input.name] == "<NONE>") {
            let description = input?.name + '___DESCRIPTION' || '';
            //    console.log(`Użycie wartości dla description: ${description}, wartość: ${values[description]}`);
            if (labelData) {
                labelData.option_description = values[description];
                input.textContent = `${labelData.option_description}`;
            } else {
                console.warn(`labelData is undefined for input: ${input.name}`);
            }

        }
        else if (input) {

        }
        switch (tag) {
            case "BUTTON":
                if (labelData?.option_value) {
                    input.textContent = `${labelData.option_value} - ${labelData.option_description}`;
                } else if (labelData?.option_value == ' ') {
                    input.textContent = `${labelData.option_description}`;
                }
                break;
            case "INPUT":
                if (input.type !== 'file') {
                    input.value = labelData?.option_value ?? fillCalculated(values, input);
                }
                break;
            case "SELECT":
                input.value = labelData?.option_value ?? fillCalculated(values, input);
                break;
        }

    }

}

function fillCalculated(values, input) {
    if (values[input.name] != '') {
        return parseFloat(values[input.name])
    }

}

export function saveOrderPositionToJson(data, filename) {
    logFunctionName('saveOrderPositionToJson')

    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function checkIfParamHidden(formula, values, param) {
    let isEnabled = false;
    try {
        isEnabled = window.FormulaHandler.evaluateFormula(
            formula,
            values,
            "param",
            param
        );
        if (param.SOURCE != "<NULL>" && param.NAME != param.SOURCE && !shouldEnable) {
            window.skipCountParams.push(param.NAME)
        }
        //    console.log(shouldEnable, 'SHOULD ENABLE')
        if (shouldEnable == 'password') { shouldEnable = false }


    }
    catch (error) {

        //    console.log('mamy error')

        showToast('error', `Error:  ${error.message}`)
    }
    return isEnabled;
}


export function hideLocked(inputs, displayValues) {

    for (const [key, value] of displayValues) {
        if (window.lockedParams.includes(key)) {

            // console.log(value,'locked')
            value['locked'] = true
        }
        else {
            value['locked'] = false
        }
    }
    return displayValues
}


export function hideParams(params, inputs) {
    for (let param of params) {

        let input = inputs[param.NAME]
        // console.log(param, 'parametry do ukrycia', input)
        if (param.FORMROW == '0') {
            input.parentElement.style.display = 'none'
        }
        // console.log(input,'ukrywam lub nie')

    }
}

