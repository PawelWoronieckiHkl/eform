import {
    generateForm,
    buildCommentSpace,

} from "/scripts/form.js";
import {
    resetSelectValues, checkFlags
} from "/scripts/formTools/formTools.js";
import { FormsManager } from './formTools/getAvailableForms.js'
import { showToast } from "/scripts/components/toast.js";
import { createElement, editElementById } from "./components/htmlManipulator.js";
import { validateAllFieldsOnSubmit } from './formTools/validateUtils.js'


function getPositionIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}
async function getPositionInfo(id) {
    try {
        const response = await fetch(`/position/${id}/data`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        });
        const data = await response.json();

        return data.position
    }
    catch (error) {
        console.error(error);
    }
}



async function init() {
    const id = getPositionIdFromUrl();
    const position = await getPositionInfo(id);

    const version = position.ver;
    const values = position.json_parameters;
    const valuesToDisplayList = JSON.parse(position.json_parameters_desc)
    const valuesToDisplay = new Map(valuesToDisplayList);
    const comment = position.comment;
    const lang = position.lang


    const formDiv = document.getElementById('dynamic-form')
    window.formsManager = new FormsManager();
    const departments = await formsManager.getAvailableForms();
    const department = departments.find(department =>
        department.products.includes(position.asortment_group_number)
    );
    const groups = await formsManager.getGroups(department.num);

    formsManager.setCurrentRootPath(position.asortment_group_number);
    formsManager.setCurrentGroup(position.asortment_group_number);
    const [editInputs, editValues, editValuesToDisplay] = await generateForm(version, position.asortment_group_number, values, valuesToDisplay, lang, true)

    setupResetButton(editInputs, editValues, editValuesToDisplay)
    const editComment = buildCommentSpace(formDiv, comment)

    setUpSaveButton(id, editValues, editValuesToDisplay, editComment, position.order_id, editInputs)

}


function setupResetButton(inputs, values, valuesToDisplay) {
    const resetButton = document.getElementById('reset-button');
    resetButton.onclick = function () {
        showToast('info', t('form.loading_data'));
        resetSelectValues([Object.keys(values), valuesToDisplay], inputs, values);
    };
}

function setUpSaveButton(id, values, valuesToDisplay, comment, orderId, inputs) {
    const sendBtn = document.getElementById('show-button')
    sendBtn.onclick = async function () {
        if (!await validateForm(inputs, values)) {
            showToast('error', t("form.incorrect_data"));
            return;
        }
        sendData(id, values, valuesToDisplay, comment, orderId)
    }
}



async function sendData(id, values, valuesToDisplay, comment, orderId) {
    const commission = document.getElementById('commission-name');
    const jsonValuesToDisplay = JSON.stringify(Array.from(valuesToDisplay.entries()));
    const postBody = {
        id: id,
        commission: commission.value,
        jsonValues: values,
        jsonValuesToDisplay: jsonValuesToDisplay,
        comment: comment.value
    }
    const json = JSON.stringify(postBody);

    try {
        const response = await fetch("/position/edit/save", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: json,
        });
        const result = await response.json();
        showToast('success', `${t('form.saved_form_success')}`);
        setTimeout(() => {
            window.location.href = `/orders/order/${orderId}`;
            return result;
        }, 3000);
    } catch (error) {
        console.error("Bład przy wysyłaniu", error);
        showToast('error', t("form.error_saving_form"));
    }

}

export async function validateForm(inputs, values) {
    console.log('validateForm')
    const visibleInputsObj = Object.fromEntries(
        Object.entries(inputs).filter(
            ([key, elem]) => getComputedStyle(elem).display !== 'none'
        )
    );
    console.log(visibleInputsObj)
    validateAllFieldsOnSubmit(visibleInputsObj, values)
    const correctFlag = await checkFlags();
    if (typeof correctFlag !== 'boolean') {
        highlightInvalidFields(correctFlag);

        return false;
    }
    return true
}

function highlightInvalidFields(flags) {
    console.log('highlightInvalidFields')
    for (let { key } of flags) {
        let elem = document.getElementById(key);
        if (elem) {
            elem.classList.add("invalid-input",)
            elem.classList.add('flash-error');
            setTimeout(() => {
                elem.classList.remove('flash-error');
            }, 2000);
        }
    }
}



init()

