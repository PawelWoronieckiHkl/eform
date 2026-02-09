import { DataLoader } from "./formTools/dataLoader.js";
import {
  getPossibleValues,
  createInputField,
  validateFormInput,
  updateFieldInputs,
  convertIntoPercent,
  updateFieldStates,
  resetDependences,
  buildValuesToDisplay,
  getInfoFromDialog,
  findParamFromValues,
  setDescription,
  fillFields,
  setWar,
  roundInputValue,
  fillInputDescription,
  setListRow,
  checkIfOptionsExist,
  getProcedures
} from "./formTools/formTools.js";
import { validateAllFieldsOnSubmit, clearDisabledValues } from "./formTools/validateUtils.js";
import { SourceWindow } from './formTools/slope.js';
import { showToast } from "./components/toast.js";
import { createElement, isEnabled } from "./components/htmlManipulator.js";
import { hideLocked, hideParams } from './formTools/createForm.js'
import { AttrLoader } from "./formTools/storage.js";
import { Translator } from "./formTools/fileTranslator.js"
import { stopSpin, startSpin } from "./components/hourglass.js";
import { fillLocalPositionObject } from "./formTools/localStorageManager.js";
import { getUid } from './formTools/getUid.js';
import { generateShortJson } from './formTools/shortJsonGen.js';


export async function generateForm(
  version = null,
  groupNumber = full,
  values = {},
  displayValues = new Map(),
  editFlag = false,
  lang = document.documentElement.lang || 'pl',
  spin = false
) {
  window.finishFlag = false;
  window.skipCountParams = [];
  window.editFlag = editFlag
  window.inputsValidators = {};
  window.inputsDefaults = {}
  window.inputFlags = {};
  window.tempGroupNumber = groupNumber
  window.enabledParams = {};
  window.afterSend = false;
  window.validParams = {};
  window.calculatedParams = new Set();
  window.lastChangedField = null; // Przechowuje ostatnio zmienione pole
  window.constValues = {};
  window.lockedParams = [];
  window.spin = spin;
  // System kolejki zadań i blokowania UI
  window.calculationQueue = [];
  window.uid = '';
  window.isCalculating = false;
  window.isPriceCalculating = false;
  const loader = new DataLoader();
  window.shortJson = {};
  window.translator = new Translator();

  const semafor = new AttrLoader();
  await window.translator.init(groupNumber, lang);
  await loader.init(version, groupNumber, lang)
  await semafor.init(groupNumber)

  const data = await loader.parseData();
  const dictValues = data.dictValues;
  let allOptionsByParameter = loader.convertDictValues(dictValues);


  const calculatedParams = {};
  if (!data) return;

  allOptionsByParameter = await loader.selectCollections(allOptionsByParameter)


  loader.createParameterFilters(allOptionsByParameter);
  const filters = loader.getAllFilters();
  fillLocalPositionObject();
  data.params = await loader.selectPrices(data.params)
  window.params = data.params;
  window.actualParam = '';
  window.actualValue = '';
  const form = document.getElementById("dynamic-form");
  const attachmentContainer = document.getElementById('attachment-container');
  const attachmentsLabel = document.querySelector('.attachment-label');
  const linkContainer = document.createElement("div");
  linkContainer.id = "link-buttons-container";
  let labelNumber = 1;
  const inputs = {};

  let options = {};
  form.innerHTML = "";
  attachmentContainer.innerHTML = '';
  attachmentsLabel.textContent = '';
  for (let i = 0; i < params.length; i++) {
    let param = params[i];
    options = await getPossibleValues(allOptionsByParameter[param.NAME], values);
    await buildHtml(options, param, filters);

  }



  async function buildHtml(options, param, filters) {

    let input;

    const paramName = param.NAME;
    if (!paramName || paramName.startsWith("_") || !param.DESCRIPTION) return;

    const div = createElement('div', { class: [`${param.NAME}-select-area`] }, form);



    if (param.SOURCE == param.NAME) {
      param.modal = new SourceWindow(1, (sourceValues) => {
        values[param.NAME] = param.modal.processSourceValues();
        buildValuesToDisplay(allOptionsByParameter, param.modal.sourceDisplayValues, param.NAME, displayValues, 'BUTTON');

        inputFlags[paramName] = true;
        validParams[paramName] = true;
        enabledParams[paramName] = true;
        const dv = displayValues.get(param.NAME);
        if (dv) {
          inputs[param.NAME].value = param.modal.sourceDisplayValues;
          inputs[param.NAME].innerText = `${dv.option_description || ''}`;

        }

        updateProcedure({
          params,
          inputs,
          values,
          displayValues,
          allOptionsByParameter,
          options,
          name: param.NAME,
          value: param.modal.sourceDisplayValues,
          groupNumber,
          tagName: '',
          filters,
          calculatedParams,
          flags: { updateInputs: false, buildValues: false, updateStates: true }
        });
      });

      try {
        await param.modal.init(param.SOURCE, param);

        // W trybie edycji, jeśli mamy już wartości, ustaw je w source window
        if (editFlag && values[param.NAME]) {
          // Przepisz istniejące wartości do sourceValues w modal
          Object.assign(param.modal.sourceValues, values[param.NAME]);

          // Ustaw TYP jeśli istnieje
          if (values[param.NAME].TYP) {
            param.modal.setTyp(values[param.NAME].TYP);
          }
        }

        input = createInputField(param, options, groupNumber, filters, allOptionsByParameter[param.NAME], values, semafor.attrValues, div);
      } catch (err) {
        console.error(err);
        return;
      }
    }

    else {

      input = createInputField(param, options, groupNumber, filters, allOptionsByParameter[param.NAME], values, semafor.attrValues, div);
    }


    input.name = param.NAME;
    input.id = param.NAME;

    if (param.TYPE === 'file') {
      console.log(`✅ form.js: Ustawiłem name dla file inputu: name="${param.NAME}"`);
    }

    inputs[param.NAME] = input;
    if (!editFlag) {
      displayValues.set(param.NAME, { 'param_description': param?.ALIAS_DESCRIPTION ?? param.DESCRIPTION });

    }

    if (!editFlag) {
      if (param?.DEFAULT != '<NULL>' && param.DEFAULT) {
        if (param.TYPE === "numeric" || !isNaN(param.DEFAULT)) {
          values[param.NAME] = parseInt(param.DEFAULT);
        }
        else {
          values[param.NAME] = param.DEFAULT;
        }
        if (inputs[param.NAME]?.type !== 'file') {
          inputs[param.NAME].value = param.DEFAULT;
        }
        buildValuesToDisplay(allOptionsByParameter, param.DEFAULT, param.NAME, displayValues, 'INPUT ');
      } else {
        values[param.NAME] = "";
      }
      if (!isSource(param)) {
        values[param.NAME + '___DESCRIPTION'] = "";
        values[param.NAME + '_ALIAS'] = "";
        values[param.NAME + '_ALIAS___DESCRIPTION'] = "";
      } else {
        // Dla parametrów SOURCE ustaw główne meta-pola
        values[param.NAME + '___DESCRIPTION'] = "";
        values[param.NAME + '_ALIAS'] = "";
        values[param.NAME + '_ALIAS___DESCRIPTION'] = "";
      }
    }
    else {

    }

    if (isSource(param)) {
      // Wartości już ustawione wyżej w trybie edycji - teraz z meta-polami z rzeczywistym stanem visibility
      values[param.NAME] = param.modal.processSourceValues();
    }
    else if (param.SCRIPTS != "<NULL>" || param.FORMULA != "<NULL>") {
      calculatedParams[param.NAME] = input;
      input.disabled = true;
      if (input.type !== 'file') {
        if (!editFlag) {
          input.value = 0
        } else {
          input.value = values[param.NAME]
        }
      }

    }
    if (editFlag) {
      // Jeśli to nie jest SOURCE param, ustaw zwykłe wartości
      if (param.SOURCE != param.NAME) {

      }
    }
    labelNumber++;
    if (input.tagName === "INPUT") {
      inputFlags[paramName] = false;
      validParams[paramName] = false;
    }


    if (!isEnabled(param.ENABLE, values, paramName) || param.FORMROW == '0') {
      div.style.display = 'none'
    }
    else {
      enabledParams[paramName] = true;
      div.style.display = 'grid'
      if (editFlag) {
        inputFlags[paramName] = true;
        validParams[paramName] = true;
      }
    }

    if (isEnabled && editFlag && input.type !== 'file') {
      if (values[param.NAME] != '') {
        input.value = values[param.NAME]
      }
      else {
        input.value = 'ffff'
      }

    }
    // Dla parametrów nie-SOURCE sprawdź opcje słownikowe
    if (!isSource(param)) {
      values = checkIfOptionsExist(allOptionsByParameter, param.NAME, values);
    }
  }



  const COMMON_PARAMS = { params, inputs, values, displayValues, allOptionsByParameter, groupNumber, calculatedParams };
  window.uid = await getUid();

  if (editFlag) { fillFields(displayValues, inputs, values) }


  for (let key in inputs) {

    // Debounce timer dla każdego inputa


    if (inputs[key].tagName === "INPUT") {
      let inputDebounceTimer = null;

      inputs[key].addEventListener("input", function () {
        if (this.tagName === "INPUT") {
          console.log(this.tagName, 'input event, value:', this.value, 'name:', this.name);
          values[this.name] = roundInputValue(this.value);

          // Anuluj poprzedni timer
          if (inputDebounceTimer) {
            clearTimeout(inputDebounceTimer);
          }

          // Ustaw nowy timer - akcja wykona się po 1 sekundzie bez pisania
          inputDebounceTimer = setTimeout(() => {
            updateProcedure({
              ...COMMON_PARAMS, options, name: this.name, value: this.value, tagName: this.tagName, filters,
              flags: { updateInputs: true, validate: true, buildValues: true, updateStates: true, percent: true, attrValues: semafor.attrValues }
            });
          }, 500);
        }
      });


    } else {
      inputs[key].addEventListener('change', function () {

        // Dla file input, wartość jest ustawiana w changeAttachmentAppearance
        let valueToUse = this.value;
        if (this.type === 'file') {
          // Dla file input użyj wartości z window.formValues (już ustawionej przez changeAttachmentAppearance)
          valueToUse = window.formValues ? window.formValues[this.name] : '';
        } else {
          values[this.name] = this.value;
        }

        window.lastChangedField = {
          name: this.name,
          value: valueToUse,
          tagName: this.tagName,
          timestamp: Date.now()
        };
        updateProcedure({
          ...COMMON_PARAMS, options, name: this.name, value: valueToUse, tagName: this.tagName, filters, attrValues: semafor.attrValues,
          flags: { buildValues: true, updateInputs: true, updateStates: true }
        });
      });
    }

  }

  document.getElementById('dialog-confirm').onclick = async () => {


    let valueToUpdate;
    let [selectedValue, paramName] = getInfoFromDialog(values, inputs, allOptionsByParameter);

    let descValue = selectedValue.replace(/~\d+$/g, '');

    values = setDescription(values, selectedValue, allOptionsByParameter, paramName)
    values[paramName] = descValue;

    if (selectedValue.includes('|') && params[paramName]?.MULTI) {
      valueToUpdate = (selectedValue.split("|"))[0];
    } else {
      valueToUpdate = selectedValue;
    }

    updateProcedure({
      ...COMMON_PARAMS, options, name: paramName, value: valueToUpdate, tagName: 'BUTTON', filters, attrValues: semafor.attrValues,
      flags: { resetDeps: true, buildValues: true, updateInputs: true, updateStates: true }
    });
  };

  window.formInputs = inputs;
  window.formValues = values;
  window.formDisplayValues = displayValues;
  window.allOptionsByParameter = allOptionsByParameter;

  // Listener dla przycisków usuwania załączników
  setupFileRemoveListeners();

  return [inputs, values, displayValues, shortJson];
}

// Funkcja czyszcząca wartości dla file input (używana przy usuwaniu załącznika)
export function clearFileInputValues(paramName) {
  if (!window.formValues || !window.formDisplayValues || !window.formInputs) {
    console.warn('FormValues not initialized');
    return;
  }

  const values = window.formValues;
  const displayValues = window.formDisplayValues;
  const inputs = window.formInputs;

  // Wyczyść values
  values[paramName] = '';

  // Wyczyść displayValues
  if (displayValues.has(paramName)) {
    const existing = displayValues.get(paramName);
    displayValues.set(paramName, { 
      param_description: existing.param_description,
      option_value: '',
      option_description: '',
      locked: false
    });
  }

  console.log(`✅ Wyczyszczono values i displayValues dla: ${paramName}`);
}

// Event delegation dla przycisków usuwania załączników
function setupFileRemoveListeners() {
  document.addEventListener('click', function(e) {
    const removeBtn = e.target.closest('.file-remove-btn');
    if (removeBtn && removeBtn.dataset.paramName) {
      const paramName = removeBtn.dataset.paramName;
      clearFileInputValues(paramName);
    }
  });
}

export async function updateProcedure({
  params, inputs, values, displayValues, allOptionsByParameter, options, name, value, groupNumber,
  tagName, filters, calculatedParams, flags = {}, attrValues = {}
}) {
  const {
    resetDeps = false,
    buildValues = false,
    updateInputs = false,
    validate = false,
    updateStates = false,
    percent = false
  } = flags;

  // Dodaj zadanie do kolejki i poczekaj na swoją kolej
  const taskId = Date.now() + Math.random();
  window.calculationQueue.push(taskId);

  // Czekaj aż będziesz pierwszy w kolejce
  while (window.calculationQueue[0] !== taskId) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  // Teraz jesteś pierwszy - zablokuj UI
  window.isCalculating = true;
  window.isPriceCalculating = false;
  disableFormButtons(true);

  console.log('🔒 updateProcedure rozpoczęte, UI zablokowane');

  window.finishFlag = false;
  if (spin) {
    startSpin()
  }

  for (let [param, input] of Object.entries(calculatedParams)) {
    if (input && input.value !== undefined) {
      values[param] = input.value;
    }
  }

  values = setDescription(values, value, allOptionsByParameter, name)
  if (percent) values = convertIntoPercent(values, name, value, inputs, params)
  displayValues = hideLocked(inputs, displayValues)
  if (buildValues) buildValuesToDisplay(allOptionsByParameter, value, name, displayValues, tagName);
  displayValues = setListRow(params, displayValues)
  values['uid'] = window.uid;
  if (updateInputs) updateFieldInputs(params, inputs, values, displayValues, allOptionsByParameter, options, name, value, tagName, filters, attrValues);
  getProcedures(inputs, allOptionsByParameter, values, options, name, value, tagName, displayValues, params)
  validateFormInput(values, inputs[name]);
  values = setDescription(values, value, allOptionsByParameter, name)
  if (updateStates) {
    await updateFieldStates(params, inputs, values, displayValues, groupNumber, allOptionsByParameter, name, value);
  }
  window.checkedParams = findParamFromValues(values, allOptionsByParameter);
  if (afterSend) validateAllFieldsOnSubmit(inputs, values)
  if (resetDeps) resetDependences([params, displayValues], name, inputs, values, allOptionsByParameter);
  window.shortJson = generateShortJson(params, values);
  fillLocalPositionObject(values, displayValues);
  hideParams(params, inputs)
  fillInputDescription(inputs, params, values, allOptionsByParameter)
  console.log('AKTUALNY JSON', values)
  if (spin) {
    stopSpin()
  }
  // Usuń się z kolejki
  window.calculationQueue.shift();

  if (window.calculationQueue.length === 0) {
    window.isCalculating = false;
    window.isPriceCalculating = true;
    disableFormButtons(false);
    console.log('🔓 Wszystkie obliczenia zakończone, UI odblokowane');
  }
  console.log('display values 123', displayValues);
  setTimeout(() => {
    window.finishFlag = true;
  }, 1300)

}

// Funkcja blokowania/odblokowywania przycisków formularza
function disableFormButtons(disable) {
  const buttons = [
    document.getElementById('show-button'),
    document.getElementById('reset-button'),
    document.getElementById('dialog-confirm')
  ].filter(btn => btn !== null);

  buttons.forEach(btn => {
    btn.disabled = disable;
    if (disable) {
      btn.classList.add('disabled', 'opacity-50', 'cursor-not-allowed');
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.5';
    } else {
      btn.classList.remove('disabled', 'opacity-50', 'cursor-not-allowed');
      btn.style.pointerEvents = '';
      btn.style.opacity = '';
    }
  });
}

export function isSource(param) {
  return param.SOURCE == param.NAME;
}

export function buildCommentSpace(destinationNode, comment = '') {
  const showCommentButton = createElement('button', {
    type: 'button',
    text: `${t('form.add_comment_button')}`,
    id: 'show-comment-button',
    class: ['btn', 'btn-link'],
  }, document.getElementById('buttons-space'))

  const MAX_LENGTH = 250;

  // Kontener na komentarz
  const commentDiv = createElement('div', { class: ['comment-space', 'col-12', 'd-none'] }, destinationNode);

  // Etykieta
  createElement('label', {
    for: 'orderComment',
    text: t('form.comment_label'),
    class: ['form-label', 'mb-1']
  }, commentDiv);

  // Pole tekstowe
  const textarea = createElement('textarea', {
    html: comment,
    id: 'orderComment',
    class: ['form-control', 'item-comment'],
    rows: 2,
    maxlength: MAX_LENGTH
  }, commentDiv);

  // Licznik znaków
  const counter = createElement('small', {
    class: ['text-muted', 'd-block', 'mt-1'],
    html: `${comment.length}/${MAX_LENGTH}`
  }, commentDiv);

  // Obsługa zdarzenia input
  textarea.addEventListener('input', function () {
    counter.innerHTML = `${this.value.length}/${MAX_LENGTH}`;
  });

  showCommentButton.addEventListener('click', () => {
    if (commentDiv.classList.contains('d-none')) {
      commentDiv.classList.remove('d-none');
      showCommentButton.textContent = `${t('form.hide_comment_button')}`;
    } else {
      commentDiv.classList.add('d-none');
      showCommentButton.textContent = `${t('form.add_comment_button')}`;
    }
  });

  return textarea;
}

export function getTotal(displayValues) {
  const totalObj = {};
  for (let [key, value] of displayValues) {
    if (value?.listsum) {
      if (value?.locked) {
        totalObj['total_hidden'] = parseFloat(value.option_value);
      }
      else {
        totalObj['total'] = parseFloat(value.option_value);
      }
    }
  }
  return totalObj;
}


export async function recalculateLastChangedField() {

  if (!window.lastChangedField) {

    return;
  }
  startSpin();
  const { name, value, tagName, timestamp } = window.lastChangedField;
  const timeSinceChange = Date.now() - timestamp;

  const params = window.params;
  const inputs = window.formInputs;
  const values = window.formValues;

  const displayValues = window.formDisplayValues;
  const allOptionsByParameter = window.allOptionsByParameter;
  const groupNumber = window.tempGroupNumber;

  if (!params || !inputs || !values) {
    return;
  }

  // Pobierz dodatkowe wymagane dane
  const calculatedParams = {};
  const options = {};
  const filters = {};

  await updateProcedure({
    params,
    inputs,
    values,
    displayValues,
    allOptionsByParameter,
    options,
    name,
    value,
    groupNumber,
    tagName,
    filters,
    calculatedParams,
    flags: {
      updateInputs: true, validate: true, buildValues: true, updateStates: true, percent: true
    }
  });

  stopSpin();
}
