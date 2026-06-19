const { getEffectiveOrgId } = require('./subPriceContext');

/**
 * Zwraca true jeśli przynajmniej jedna pozycja ma niepuste subParamValues.
 */
function orderHasSubPrices(cleanOrderItems) {
  if (!Array.isArray(cleanOrderItems)) return false;
  for (const table of cleanOrderItems) {
    if (!table?.rows) continue;
    for (const rowObj of table.rows) {
      const subVals = rowObj?.item?.subParamValues;
      if (Array.isArray(subVals) && subVals.length > 0) return true;
    }
  }
  return false;
}

/**
 * Wylicza dwa osobne sumy SUB cen z `orderItems`:
 *  - subVisible: suma SUB params z listsum=true i NIE-locked
 *  - subLocked: suma SUB params z listsum=true i locked=true
 * Per pozycja bierzemy ostatnią wartość listsum (overwrite semantics).
 */
function calcSubTotals(orderItems) {
  let subVisible = 0;
  let subLocked = 0;
  if (!Array.isArray(orderItems)) return { subVisible, subLocked };

  for (const item of orderItems) {
    let parsed = item?.json_parameters_desc;
    try {
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    } catch {
      parsed = null;
    }
    if (!parsed) continue;

    const entries = parsed instanceof Map
      ? Array.from(parsed.entries())
      : (Array.isArray(parsed) ? parsed : Object.entries(parsed));

    let itemVisible = 0;
    let itemLocked = 0;
    for (const [key, param] of entries) {
      if (!key || !key.startsWith('SUB___') || !param || typeof param !== 'object') continue;
      if (!param.listsum) continue;
      const val = parseFloat(param.option_value);
      if (!isFinite(val)) continue;
      if (param.locked === true) {
        itemLocked = val;
      } else {
        itemVisible = val;
      }
    }
    subVisible += itemVisible;
    subLocked += itemLocked;
  }
  return {
    subVisible: parseFloat(subVisible.toFixed(2)),
    subLocked: parseFloat(subLocked.toFixed(2))
  };
}

/**
 * Określa tryb wyświetlania cen SUB w PDF / mailu (zgodny z widokiem strony).
 */
function resolveSubPricePdfView(req, hasSubPrices) {
  const effectiveOrgId = getEffectiveOrgId(req);
  const nonHklOrg = effectiveOrgId != null && Number(effectiveOrgId) !== 3;
  const sessionUser = req.session?.user;
  const contextUser = req.session?.context_user;
  const showSubActive = sessionUser?.showSubParams || false;

  const isPureClient = !sessionUser?.isOwner && !sessionUser?.isAdmin
    && !sessionUser?.isEmployee && !sessionUser?.isGroup && !sessionUser?.isGroupShop
    && nonHklOrg;

  const hasSubToggle = nonHklOrg && (
    (sessionUser?.isOwner && !sessionUser?.isAdmin) ||
    (sessionUser?.isAdmin && !!contextUser)
  );

  const isClientView = (isPureClient || (hasSubToggle && !showSubActive)) && hasSubPrices;
  const showBoth = hasSubToggle && showSubActive && hasSubPrices;

  return { isClientView, showBoth, hasSubToggle, isPureClient, showSubActive, nonHklOrg };
}

/**
 * Buduje etykietowane totale do PDF / maila — ta sama logika co na stronie zamówienia.
 */
function buildPdfSendDataTotals({
  isClientView,
  showBoth,
  orderItems,
  totalPrice,
  translate,
  showGoldPrices = true
}) {
  const __ = translate || ((key) => key);

  if (isClientView) {
    const subTotals = calcSubTotals(orderItems);
    return {
      total: subTotals.subVisible && subTotals.subVisible !== 0
        ? `${__('order.total')}: ${subTotals.subVisible}€` : null,
      total_hidden: subTotals.subLocked && subTotals.subLocked !== 0
        ? `${__('order.total_hidden')}: ${subTotals.subLocked}€` : null
    };
  }

  if (showBoth) {
    const subTotals = calcSubTotals(orderItems);
    return {
      total: totalPrice?.visible && Number(totalPrice.visible) !== 0
        ? `${__('order.total')}: ${totalPrice.visible}€` : null,
      total_hidden: subTotals.subLocked && subTotals.subLocked !== 0
        ? `${__('order.total_hidden')}: ${subTotals.subLocked}€` : null
    };
  }

  const result = { total: null, total_hidden: null };
  if (totalPrice?.visible && Number(totalPrice.visible) !== 0) {
    result.total = `${__('order.total')}: ${totalPrice.visible}€`;
  }
  if (showGoldPrices) {
    if (totalPrice?.hidden && Number(totalPrice.hidden) !== 0) {
      result.total_hidden = `${__('order.total_hidden')}: ${totalPrice.hidden}€`;
    } else if (totalPrice?.visible && Number(totalPrice.visible) !== 0) {
      result.total_hidden = `${__('order.total_hidden')}: ${totalPrice.visible}€`;
    }
  }
  return result;
}

module.exports = {
  orderHasSubPrices,
  calcSubTotals,
  resolveSubPricePdfView,
  buildPdfSendDataTotals
};
