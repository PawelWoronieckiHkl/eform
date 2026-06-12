function buildOrderItemStructure(
	order = 0,
	listPrice = {},
	discountPercentage = 0,
	discount = 0,
	unitPrice = 0,
	totalPrice = 0,
	totalPriceSub = 0,
    name,
	commission,
	jsonValues ,
    jsonValuesToDisplay,
	amount,
    comment,
    version,
    groupNumber,
    lang,
    department,
    groupName,
    shortJson

) {
    let body = {}
    body['order']= order;
    body['listPrice']= listPrice;
    body['discountPercentage'] = discountPercentage;
    body['discount']= discount;
    body['unitPrice']=unitPrice;
    body['totalPrice']=totalPrice;
    body['totalPriceSub']=totalPriceSub;
    body['name']=name;
    body['commission']=commission;
    body['jsonValues']=jsonValues;
    body['jsonValuesToDisplay']= jsonValuesToDisplay;
    body['amount']=amount;
    body['comment']= comment;
    body['version'] = version;
    body['groupNumber']= groupNumber
    body['lang'] = lang
    body['department']= department
    body['group'] = groupName
    body['parameters_short'] = shortJson;
    return body;
}

module.exports = {buildOrderItemStructure}