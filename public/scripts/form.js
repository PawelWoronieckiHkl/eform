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
  setListRow
} from "./formTools/formTools.js";
import { validateAllFieldsOnSubmit, clearDisabledValues } from "./formTools/validateUtils.js";
import { SourceWindow } from './formTools/slope.js';
import { showToast } from "./components/toast.js";
import { createElement, isEnabled } from "./components/htmlManipulator.js";
import { hideLocked, hideParams } from './formTools/createForm.js'
import { AttrLoader } from "./formTools/storage.js";
import { Translator } from "./formTools/fileTranslator.js"

export async function generateForm(
  version = null,
  groupNumber = full,
  values = {},
  displayValues = new Map(),
  lang = document.documentElement.lang || 'pl',
  editFlag = false

) {
  window.editFlag = editFlag
  window.inputsValidators = {};
  window.inputsDefaults = {}
  window.inputFlags = {};
  window.tempGroupNumber = groupNumber
  window.enabledParams = {};
  window.afterSend = false;
  window.validParams = {};
  window.constValues = {};
  window.lockedParams = [];
  const loader = new DataLoader();
  window.translator = new Translator();
  const semafor = new AttrLoader();
  await window.translator.init(groupNumber, lang);
  await loader.init(version, groupNumber, lang)
  await semafor.init(groupNumber)

  const data = await loader.parseData();
  const dictValues = data.dictValues;
  let allOptionsByParameter = loader.convertDictValues(dictValues);
  const filters = loader.getAllFilters();
  const calculatedParams = {};
  if (!data) return;
  allOptionsByParameter = await loader.selectCollections(allOptionsByParameter)
  // console.log('przed selectPrices', data.params)
  data.params = await loader.selectPrices(data.params)
  window.params = data.params;
  window.actualParam = '';
  window.actualValue = '';
  const form = document.getElementById("dynamic-form");
  const linkContainer = document.createElement("div");
  linkContainer.id = "link-buttons-container"; // pozycjonowanie CSS
  let labelNumber = 1;
  const inputs = {};
  
  let options = {};
  form.innerHTML = "";

  for (let i = 0; i < params.length; i++) {
    let param = params[i];
    options = await getPossibleValues(allOptionsByParameter[param.NAME], values);
    await buildHtml(options, param, filters);

  }



  async function buildHtml(options, param, filters) {  // dodane async
    let input;
    // console.log(param,'link i instrukcja')
    const paramName = param.NAME;
    if (!paramName || paramName.startsWith("_") || !param.DESCRIPTION) return;

    const div = createElement('div', { class: [`${param.NAME}-select-area`] }, form);

    createElement('label', { text: `${param.DESCRIPTION}: ` }, div);

    if (param.SOURCE == param.NAME) {
      param.modal = new SourceWindow(1, (sourceValues) => {
        // 1. Przepisz do values
        values[param.NAME] = sourceValues;

        // 2. Uaktualnij displayValues dla całego obiektu sourceWindow
        buildValuesToDisplay(allOptionsByParameter, sourceValues, param.NAME, displayValues, 'BUTTON');

        inputFlags[paramName] = true;
        validParams[paramName] = true;
        enabledParams[paramName] = true;
        const dv = displayValues.get(param.NAME);
        if (dv) {
          // Możesz wybrać display tekstu — np. sam opis:
          inputs[param.NAME].value = sourceValues;
          inputs[param.NAME].innerText = `${dv.option_description || ''}`;

          // lub krótki value
          // inputs[param.NAME].innerText = `${param.DESCRIPTION}: ${dv.option_value || ''}`;
        }

        // 4. Odśwież formularz (jeśli trzeba)
        updateProcedure({
          params,
          inputs,
          values,
          displayValues,
          allOptionsByParameter,
          options,
          name: param.NAME,
          value: sourceValues,
          groupNumber,
          tagName: '',
          filters,
          calculatedParams,
          flags: { updateInputs: false, buildValues: false, updateStates: true }
        });
      });

      try {
        await param.modal.init(param.SOURCE, param);

        input = createInputField(param, options, groupNumber, filters, allOptionsByParameter[param.NAME], values);
      } catch (err) {
        console.error(err);
        return;
      }



    }

    else {
      
      input = createInputField(param, options, groupNumber, filters, allOptionsByParameter[param.NAME], values, semafor.attrValues);
    }


    input.name = param.NAME;
    input.id = param.NAME;
    div.appendChild(input);
    div.appendChild(createElement('br'));

    inputs[param.NAME] = input;
    if (!editFlag) {
      displayValues.set(param.NAME, { 'param_description': param?.ALIAS_DESCRIPTION ?? param.DESCRIPTION });
    } else {
      // jakieś akcje w trybie edycji (jeśli potrzebne)
    }

    if (!editFlag) {
      if (param?.DEFAULT != '<NULL>' && param.DEFAULT) {
        if (param.TYPE === "numeric") {
          values[param.NAME] = parseInt(param.DEFAULT);
        }
        else {
          values[param.NAME] = param.DEFAULT;
        }
        inputs[param.NAME].value = param.DEFAULT;
        buildValuesToDisplay(allOptionsByParameter, param.DEFAULT, param.NAME, displayValues, 'INPUT ');
      } else {
        values[param.NAME] = "";
      }
      values[param.NAME + '___DESCRIPTION'] = "";
      values[param.NAME + '_ALIAS'] = "";
    } else {
      // tryb edycji (jeśli potrzebny)
    }

    if (param.SOURCE == param.NAME) {
      values[param.NAME] = param.modal.getObject();

    }
    else if (param.SCRIPTS != "<NULL>" || param.FORMULA != "<NULL>") {
      calculatedParams[param.NAME] = input;
      input.disabled = true;
      if (!editFlag) {
        input.value = 0
      } else {
        input.value = values[param.NAME]


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

    if (isEnabled && editFlag) {
      if (values[param.NAME] != '') {
        input.value = values[param.NAME]
      }
      else {
        input.value = 'ffff'
      }

    }

  }



  const COMMON_PARAMS = { params, inputs, values, displayValues, allOptionsByParameter, groupNumber, calculatedParams };

  if (editFlag) { fillFields(displayValues, inputs, values) }

  for (let key in inputs) {



    inputs[key].addEventListener("input", function () {
      if (this.tagName === "INPUT") {
        console.log('select 1 @@@@@@@@@@@@@@@@@@@@@@@@@')
        values[this.name] = parseFloat(this.value);
        updateProcedure({
          ...COMMON_PARAMS, options, name: this.name, value: this.value, tagName: this.tagName, filters,
          flags: { updateInputs: true, validate: true, buildValues: true, updateStates: true, percent: true, attrValues:semafor.attrValues }
        });
      }

    });

    if (inputs[key].tagName === "INPUT") {
      inputs[key].addEventListener('blur', function () {
        console.log('select 2 @@@@@@@@@@@@@@@@@@@@@@@@@')
        updateProcedure({
          ...COMMON_PARAMS, options, name: this.name, value: this.value, tagName: this.tagName, filters,
          flags: { updateInputs: true, validate: true, buildValues: true, updateStates: true, percent: true, attrValues:semafor.attrValues }
        });
      });

    } else {
      inputs[key].addEventListener('change', function () {
        console.log('select 3 @@@@@@@@@@@@@@@@@@@@@@@@@')
        values[this.name] = this.value;
        updateProcedure({
          ...COMMON_PARAMS, options, name: this.name, value: this.value, tagName: this.tagName, filters,attrValues:semafor.attrValues,
          flags: { buildValues: true, updateInputs: true, updateStates: true }
        });
      });
    }

  }

  document.getElementById('dialog-confirm').onclick = () => {
    let valueToUpdate = ''
    let [selectedValue, paramName] = getInfoFromDialog(values, inputs, allOptionsByParameter);
    values[paramName] = selectedValue;

    if (selectedValue.includes('|') && params[paramName]?.MULTI) {

      valueToUpdate = (selectedValue.split("|"))[0];
    }
    else {
      valueToUpdate = selectedValue
    }

    console.log('select 4 @@@@@@@@@@@@@@@@@@@@@@@@@')
    updateProcedure({
      ...COMMON_PARAMS, options, name: paramName, value: valueToUpdate, tagName: 'BUTTON', filters, attrValues:semafor.attrValues,
      flags: { resetDeps: true, buildValues: true, updateInputs: true, updateStates: true }
    });
  };

  return [inputs, values, displayValues];
}

export function updateProcedure({
  params, inputs, values, displayValues, allOptionsByParameter, options, name, value, groupNumber,
  tagName, filters, calculatedParams, flags = {},attrValues={}
}) {
  const {
    resetDeps = false,
    buildValues = false,
    updateInputs = false,
    validate = false,
    updateStates = false,
    percent = false
  } = flags;

  for (let [param, input] of Object.entries(calculatedParams)) {

    values[param] = input.value
  }

  setDescription(values, value, allOptionsByParameter, name)

  if (percent) values = convertIntoPercent(values, name, value, inputs, params)

  displayValues = hideLocked(inputs, displayValues)

  if (buildValues) buildValuesToDisplay(allOptionsByParameter, value, name, displayValues, tagName);
  displayValues = setListRow(params, displayValues)
  // console.log('displayValues po setListRow', displayValues)
  // console.log('displayValues wejscie', allOptionsByParameter, value, name, displayValues, tagName)
  // problem z resetowaniem sterowania jest w updateFieldInputs
  
  if (updateInputs) updateFieldInputs(params, inputs, values, displayValues, allOptionsByParameter, options, name, value, tagName, filters,attrValues);

  if (validate) validateFormInput(values, inputs[name]);

  if (updateStates) updateFieldStates(params, inputs, values, displayValues, groupNumber, allOptionsByParameter);

  window.checkedParams = findParamFromValues(values, allOptionsByParameter);

  if (afterSend) validateAllFieldsOnSubmit(inputs, values)
  if (resetDeps) resetDependences([params, displayValues], name, inputs, values, allOptionsByParameter);


  values = clearDisabledValues(values, displayValues)
  hideParams(params, inputs)

  // console.log('displayValues po hideLocked', displayValues)
}

export function buildCommentSpace(destinationNode, comment = '') {
  const MAX_LENGTH = 250;

  // Kontener na komentarz
  const commentDiv = createElement('div', { class: ['comment-space', 'col-12'] }, destinationNode);

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

  return textarea;
}

