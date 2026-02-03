import {
    generateForm,
    buildCommentSpace,
    getTotal,
    recalculateLastChangedField

} from "/scripts/form.js";
import {
    resetSelectValues, checkFlags
} from "/scripts/formTools/formTools.js";
import { FormsManager } from './formTools/getAvailableForms.js'
import { showToast } from "/scripts/components/toast.js";
import { createElement, editElementById } from "./components/htmlManipulator.js";
import { validateAllFieldsOnSubmit } from './formTools/validateUtils.js'
import { checkIfPriceIsCorrect } from './formTools/pricesCalculator.js'
import { startSpin, stopSpin } from "./components/hourglass.js";


function getPositionIdFromUrl() {
    // Sprawdź najpierw query parameter ?id=123
    const params = new URLSearchParams(window.location.search);
    const queryId = params.get('id');

    if (queryId) {
        //    console.log('ID z query params:', queryId);
        return queryId;
    }

    // Jeśli nie ma query param, czytaj z URL path /position/123/edit
    const pathParts = window.location.pathname.split('/');
    const positionIndex = pathParts.findIndex(part => part === 'position');

    if (positionIndex !== -1 && pathParts[positionIndex + 1]) {
        const pathId = pathParts[positionIndex + 1];
        //    console.log('ID z URL path:', pathId);
        return pathId;
    }

    //    console.log('Nie znaleziono ID w URL');
    return null;
}
async function getPositionInfo(id) {
    //    console.log(id, 'semaasdsad')
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
    const [editInputs, editValues, editValuesToDisplay] = await generateForm(version, position.asortment_group_number, values, valuesToDisplay, true, lang)

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
    let sentState = false;

    console.log('setupShowButton')
    const showButton = document.getElementById('show-button');

    showButton.onclick = function () {
        // Sprawdź czy już wysłano
        if (sentState) {
            console.log('⚠️ Formularz już został wysłany');
            showToast('warning', 'Formularz już został wysłany');
            throw new Error('Already sent');
        }

        // Sprawdź czy trwają obliczenia
        if (window.isCalculating) {
            showToast('warning', 'Trwają obliczenia, poczekaj...');
            return;
        }

        // 🔥 KROK 1: Wymuś przeliczenie ostatnio zmienionego pola
        console.log('🚀 Wymuszam przeliczenie przed zapisem...');
        recalculateLastChangedField()
            .then(() => {
                // KROK 2: Czekaj aż kolejka się opróżni
                console.log('⏳ Czekam na zakończenie wszystkich obliczeń...');
                return new Promise(resolve => {
                    const checkQueue = () => {
                        if (!window.calculationQueue || window.calculationQueue.length === 0) {
                            resolve();
                        } else {
                            setTimeout(checkQueue, 50);
                        }
                    };
                    checkQueue();
                });
            })
            .then(() => {
                // KROK 2.5: Wymuś sprawdzenie cen i aktualizację displayValues
                console.log('💰 Sprawdzam i aktualizuję ceny...');
                valuesToDisplay = checkIfPriceIsCorrect(values, inputs, valuesToDisplay);
                console.log('✅ DisplayValues zaktualizowane:', valuesToDisplay);
            })
            .then(() => {
                // KROK 3: Walidacja
                console.log('✅ Przeliczenie zakończone, przechodzę do walidacji...');
                return validateForm(inputs, values);
            })
            .then((isValid) => {
                if (!isValid) {
                    showToast('error', t("form.incorrect_data"));
                    throw new Error('Validation failed');
                }

                // KROK 4: Ostateczne sprawdzenie flag


                console.log('✅ Wszystkie warunki spełnione, wysyłam dane...');
                return new Promise(resolve => {
                    setTimeout(() => {
                        sendData(id, values, valuesToDisplay, comment, orderId)
                            .then(() => {
                                
                                resolve();
                                sentState = true;
                            });
                    }, 1000);
                });
            })
            .catch((error) => {
                if (error.message !== 'Validation failed' && error.message !== 'Form not ready' && error.message !== 'Already sent') {
                    console.error('Błąd podczas zapisywania:', error);
                    showToast('error', t("form.error_saving_form"));
                }
            });
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
        comment: comment.value,
        jsonShort: window.shortJson

    }
    const total = getTotal(valuesToDisplay);
    //    console.log(total, 'TOTAL')
    postBody.total = total;

    const json = JSON.stringify(postBody);

    try {
        const response = await fetch("/position/edit/save", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: json,
        });
        const result = await response.json();
        showToast('success', `${t('form.saved_form_success')}`);
        return new Promise(resolve => {
            console.log(window.jsonShort, 'JSON SHORT')
            setTimeout(() => {
                
                window.location.href = `/orders/order/${orderId}`;
                resolve(result);
            }, 3000);
        });
    } catch (error) {
        console.error("Bład przy wysyłaniu", error);
        showToast('error', t("form.error_saving_form"));
        throw error;
    }

}

export async function validateForm(inputs, values) {
    //    console.log('validateForm')
    const visibleInputsObj = Object.fromEntries(
        Object.entries(inputs).filter(
            ([key, elem]) => getComputedStyle(elem).display !== 'none'
        )
    );
    //    console.log(visibleInputsObj)
    validateAllFieldsOnSubmit(visibleInputsObj, values)
    const correctFlag = await checkFlags();
    if (typeof correctFlag !== 'boolean') {
        highlightInvalidFields(correctFlag);

        return false;
    }
    return true
}

function highlightInvalidFields(flags) {
    //    console.log('highlightInvalidFields')
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

