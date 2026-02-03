
import { createElement } from './htmlManipulator.js'

export async function createChecboxField(parent, id, textLabel= t('form.last_choice')) {
  const checkBoxLabel = textLabel;
  if (document.getElementById('check-form') == null) {
    if (!document.getElementById('form-check')) {
      const checkDiv = createElement("div", { id: 'check-form', class: ["form-check"] }, parent);
      createElement("label", { class: ["form-check-label", 'checkboxtext'], for: "last-group-checkbox", text: checkBoxLabel }, checkDiv);
      const checkBox = createElement("input", { type: "checkbox", class: ["form-check-input"], id: "last-group-checkbox" }, checkDiv);

      return checkBox;
    }
  }
}

export async function checkBoxReaction(checkBox) {
  if (checkBox && checkBox.checked) {
    console.log('checkbox checked')
    checkBox.checked = false;
    checkBox.disabled = true;
    checkBox.parentElement.hidden = true;

    return await getLastChoice();
  }
}


export async function getLastChoice() {
  console.log('getLastChoice')
  let choice = JSON.parse(localStorage.getItem('lastChoice'))

  if (choice?.department && choice?.group) {
    return choice
  } else {
    console.log('No last choice found');
    return null;
  }
}

export function createLastConfigInfoPopUp() {
  const parent = document.body
   parent.style.display='block'
  
  const infoContainer = createElement('div', {
    class: ['last-config-info',  'bg-transparent', 'justify-content-center', 'align-items-center', 'p-3'],
    id:'last-config-info'
  }, parent)

  const loadButton = createElement('button', {
    class: ['btn', 'btn-outline-secondary'],
    text: t('position.get_last_config'),
    type: 'button',
    id:'last-config-confirm'
  }, infoContainer)

  return { container: infoContainer, lastConfigButton: loadButton }
}