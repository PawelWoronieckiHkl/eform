/**
 * Split a PDF cell value into value and description parts.
 * Matches orderService format: "option_value - option_description" or plain value.
 */
function pdfValueParts(str) {
  if (str === null || str === undefined || str === '') {
    return { val: '-', desc: null };
  }
  const s = String(str);
  const dashIdx = s.indexOf(' - ');
  if (dashIdx !== -1) {
    return {
      val: s.substring(0, dashIdx).trim(),
      desc: s.substring(dashIdx + 3).trim()
    };
  }
  return { val: s, desc: null };
}

module.exports = { pdfValueParts };
