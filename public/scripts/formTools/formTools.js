import {

	processCommissionInput,
	getPossibleValues,
	createInputField,
	saveOrderPositionToJson,
	fillFields
} from './createForm.js';

import {
	resetDependences,
	resetSelectValues,
	resetDisplayEntry,
	buildValuesToDisplay,
	updateFieldInputs,
	updateFieldStates,
	checkRelated,
	resetAllDOM,
	setWar,
	convertIntoPercent,
	setListRow
} from './updateFieldsAndValues.js';

import {
	getProcedures,
	setDefaultValues,
	checkFlags,
	validateFormInput
} from './validateUtils.js';

import {
	createDialog, getInfoFromDialog,

} from './dialogUtils_copy.js';

export function logFunctionName(functionName) {
	const sep = '-'.repeat(10)
	console.log(`${sep} ${functionName} ${sep}`)
}

export function findParamFromValues(values, paramDict) {
	const valuesWithParameters = {};

	for (const [paramName, value] of Object.entries(values)) {

		const foundItem = searchForParameter(value, paramDict, paramName)
		if (foundItem) {
			valuesWithParameters[paramName] = foundItem;
		}
	}

	return valuesWithParameters;
}

export function searchForParameter(value, paramDict, paramName) {

	const paramArray = paramDict[paramName] ?? false;

	if (paramArray) {

		return paramArray.find(item => {
			let itemVal = typeof item.VALUE === 'string' ? item.VALUE : '';
			itemVal = itemVal.replace(/~\d+$/, '')
			const searchVal = typeof value === 'string' ? value : '';
			return itemVal.toUpperCase() === searchVal.toUpperCase();
		});
	} else {
		return false;
	}
}

export function searchForParameterByAlias(value, paramDict, paramName) {

	const paramArray = paramDict[paramName] ?? false;

	if (paramArray) {
		return paramArray.find(item => {
			const itemVal = typeof item.ALIAS === 'string' ? item.ALIAS : '';
			const searchVal = typeof value === 'string' ? value : '';
			return itemVal.toUpperCase() === searchVal.toUpperCase();
		});
	} else {
		return false;
	}
}
export function normalizeFilename(filename) {
	if (filename) {
		return filename
			.split('.')[0]                        // usuń rozszerzenie
			.replace(/~\d+$/, '')                 // usuń końcowe _123 jeśli jest
	}
	return '';
}

export function setDescription(values, value, allOptionsByParameter, name) {
	if (value === '<NONE>') console.log('NONE VALUE');
	const valObj = searchForParameter(value, allOptionsByParameter, name)

	const description = `${name}___DESCRIPTION`

	if (valObj?.ALIAS_DESCRIPTION || valObj?.ALIAS) {

		const prodAliasName = `${name}_ALIAS`
		const prodAliasComment = `${name}_ALIAS___DESCRIPTION`
		values[prodAliasName] = valObj.ALIAS
		values[prodAliasComment] = valObj.ALIAS_DESCRIPTION
	}
	if (valObj?.DESCRIPTION) {

		values[description] = valObj.DESCRIPTION
	}
}

export {
	processCommissionInput,
	getPossibleValues,
	createInputField,
	saveOrderPositionToJson,
	resetDependences,
	resetSelectValues,
	resetDisplayEntry,
	buildValuesToDisplay,
	updateFieldInputs,
	updateFieldStates,
	checkRelated,
	getProcedures,
	setDefaultValues,
	checkFlags,
	setWar,
	validateFormInput,
	createDialog,
	getInfoFromDialog,
	resetAllDOM,
	fillFields,
	convertIntoPercent,
	setListRow
}