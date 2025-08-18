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
	setWar
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
	console.log()
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
			const itemVal = typeof item.VALUE === 'string' ? item.VALUE : '';
			const searchVal = typeof value === 'string' ? value : '';
			return itemVal.toUpperCase() === searchVal.toUpperCase();
		});
	} else {
		return false;
	}
}

export function setDescription(values, value, allOptionsByParameter, name) {

	const valObj = searchForParameter(value, allOptionsByParameter, name)
	const description = `${name}___DESCRIPTION`
	console.log(valObj)
	if (valObj?.ALIAS_DESCRIPTION || valObj?.ALIAS) {
		console.log(valObj)
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
	fillFields

}