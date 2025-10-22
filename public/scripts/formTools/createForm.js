import { logFunctionName, searchForParameter } from './formTools.js';
import { createDialog } from './dialogUtils_copy.js'
import { isEnabled } from '../components/htmlManipulator.js';
import { SourceWindow } from './slope.js';


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

export function createInputField(param, options, groupNumber, filters, allOptions, values, attrs) {

    logFunctionName('createInputField')
    options = options.possibleElements;
    if (param.SOURCE == param.NAME) {
        let btn = document.createElement("button");
        btn.classList.add("btn", 'color-dialog-btn', 'source-btn');
        btn.id = param.NAME;
        btn.type = 'button';
        btn.innerHTML = `${t('Uzupełnij')}`;
        btn.onclick = async function () {
            console.log('btn click slope')
            await param.modal.show()

        };
        return btn;
    }

    if (param.GRAPHICS == 'true' && Array.isArray(options) && (param.TYPE != 'link')) {
        let btn = document.createElement("button");
        btn.classList.add("btn", 'color-dialog-btn');
        btn.id = param.NAME;
        btn.type = 'button';
        if (param.DEFAULT != '<NULL>') {
            let val = options.find(val => val.VALUE == param.DEFAULT)
            if (param.DEFAULT == '<NONE>') {
                btn.textContent = ` ${val.DESCRIPTION}`;
            }
            else {
                btn.textContent = `${val.VALUE}-${val.DESCRIPTION}`
            }
        }
        else {
            btn.innerHTML = `${t('form.check_word')}`;
        }


        btn.onclick = function () {
            createDialog(param, options, groupNumber, filters[param.NAME], attrs);
        };
        return btn;
    }
    if (allOptions?.length ?? 0 > 1) {
        let select = document.createElement("select");
        select.classList.add("select");
        select.appendChild(new Option(t('form.check_option'), ""));
        for (let idx = 0; idx < allOptions.length; idx++) {
            let row = allOptions[idx];
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
        return select;
    }

    let input = document.createElement("input");

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

    if (param.TYPE === 'link') {

        const linkBtn = document.createElement("a");
        linkBtn.href = param.URL || "#";
        linkBtn.textContent = param.DESCRIPTION || "Otwórz";
        linkBtn.classList.add("link-btn", "tiny-link-btn"); // dodaj dodatkową klasę
        linkBtn.value = param.NAME
        linkBtn.rel = "noopener noreferrer";


        setTimeout(() => {
            // Wyszukaj rodzica po klasie w DOM
            const parentDiv = document.querySelector(`.${param.NAME}-select-area`);
            if (parentDiv) {
                // Usuń starą klasę (przykładowa nazwa, dostosuj do istniejącej)
                parentDiv.classList.remove(`${param.NAME}-select-area`);
                // Dodaj nową klasę dla linków, np. 'link-select-area'
                parentDiv.classList.add('link-area');
            }
        }, 0);

        return linkBtn;
    }

    return input;
}

export function fillFields(displayValues, inputs, values) {
    console.log('fillFields')
    for (let input of Object.values(inputs)) {
        const tag = input.tagName
        const labelData = displayValues.get(input.name)
        // console.log(input.name, labelData)
        if (values[input.name] == "<NONE>") {
            let description = input?.name + '___DESCRIPTION' || '';
            console.log(`Użycie wartości dla description: ${description}, wartość: ${values[description]}`);
            if (labelData) {
                labelData.option_description = values[description];
                input.textContent = `${labelData.option_description}`;
            } else {
                console.warn(`labelData is undefined for input: ${input.name}`);
            }
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
                input.value = labelData?.option_value ?? fillCalculated(values, input);
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

    }
    catch (error) {

        console.log('mamy error')

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

