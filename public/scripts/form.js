import { DataLoader } from "./formTools/dataLoader.js";
import {
  getPossibleValues,
  createInputField,
  validateFormInput,
  updateFieldInputs,

  updateFieldStates,
  resetDependences,
  buildValuesToDisplay,
  getInfoFromDialog,
  findParamFromValues,
  setDescription,
  fillFields,
  setWar
} from "./formTools/formTools.js";
import { validateAllFieldsOnSubmit, clearDisabledValues } from "./formTools/validateUtils.js";
import { SourceWindow } from './formTools/slope.js';
import { showToast } from "./components/toast.js";
import { createElement, isEnabled } from "./components/htmlManipulator.js";




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
  window.constValues = {}
  const loader = new DataLoader();
  console.log(groupNumber,version,lang, 'siema eniu')
  loader.init(version, groupNumber, lang)
  const data = await loader.parseData();
  const dictValues = data.dictValues;
  let allOptionsByParameter = loader.convertDictValues(dictValues);
  const filters = loader.getAllFilters();
  const calculatedParams = {};
  if (!data) return;
  allOptionsByParameter = await loader.selectCollections(allOptionsByParameter)
  console.log(allOptionsByParameter,'test')
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
    console.log(param.MULTI, 'multitulti')
    options = await getPossibleValues(allOptionsByParameter[param.NAME], values);
    await buildHtml(options, param, filters);

  }



  async function buildHtml(options, param, filters) {  // dodane async
    let input;

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
      input = createInputField(param, options, groupNumber, filters, allOptionsByParameter[param.NAME], values);
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
        
        values[param.NAME] = param.DEFAULT;
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


    if (!isEnabled(param.ENABLE, values)) {
      div.style.display = 'none'
    } else {
      enabledParams[paramName] = true;
      div.style.display = 'grid'
      if (editFlag) {
        inputFlags[paramName] = true;
        validParams[paramName] = true;
      }
    }

    if (isEnabled && editFlag) {

    }
  }



  const COMMON_PARAMS = { params, inputs, values, displayValues, allOptionsByParameter, groupNumber, calculatedParams };

  if (editFlag) { fillFields(displayValues, inputs, values) }

  for (let key in inputs) {



    inputs[key].addEventListener("input", function () {
      if (this.tagName === "INPUT") {

        values[this.name] = parseFloat(this.value);
      }

      // TU MIE SIE RESTEJUEM
      // updateProcedure({ ...COMMON_PARAMS, name: this.name, value: this.value, tagName: this.tagName, flags: { resetDeps: true, buildValues: true } });
      // console.log(values.WYMIAROWANIE_SLOPOW, 'wariacie 1,5')
    });

    if (inputs[key].tagName === "INPUT") {


      inputs[key].addEventListener('blur', function () {

        updateProcedure({
          ...COMMON_PARAMS, options, name: this.name, value: this.value, tagName: this.tagName, filters,
          flags: { updateInputs: true, validate: true, buildValues: true, updateStates: true }
        });
      });

    } else {
      inputs[key].addEventListener('change', function () {

        values[this.name] = this.value;
        updateProcedure({
          ...COMMON_PARAMS, options, name: this.name, value: this.value, tagName: this.tagName, filters,
          flags: { updateInputs: true, updateStates: true }
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

    updateProcedure({
      ...COMMON_PARAMS, options, name: paramName, value: valueToUpdate, tagName: 'BUTTON', filters,
      flags: { resetDeps: true, buildValues: true, updateInputs: true, updateStates: true }
    });
  };

  return [inputs, values, displayValues];
}

export function updateProcedure({
  params, inputs, values, displayValues, allOptionsByParameter, options, name, value, groupNumber,
  tagName, filters, calculatedParams, flags = {}
}) {
  const {
    resetDeps = false,
    buildValues = false,
    updateInputs = false,
    validate = false,
    updateStates = false
  } = flags;

  for (let [param, input] of Object.entries(calculatedParams)) {

    values[param] = input.value
  }

  setDescription(values, value, allOptionsByParameter, name)




  if (buildValues) buildValuesToDisplay(allOptionsByParameter, value, name, displayValues, tagName);

  // problem z resetowaniem sterowania jest w updateFieldInputs

  if (updateInputs) updateFieldInputs(params, inputs, values, displayValues, allOptionsByParameter, options, name, value, tagName, filters);

  if (validate) validateFormInput(values, inputs[name]);

  if (updateStates) updateFieldStates(params, inputs, values, displayValues, groupNumber,allOptionsByParameter);

  window.checkedParams = findParamFromValues(values, allOptionsByParameter);

  if (afterSend) validateAllFieldsOnSubmit(inputs, values)
  if (resetDeps) resetDependences([params, displayValues], name, inputs, values, allOptionsByParameter);
  console.log(values, 'wartosci')

  values = clearDisabledValues(values, displayValues)
  console.log(displayValues, 'SPRAWDZAM DOPLATE')

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

