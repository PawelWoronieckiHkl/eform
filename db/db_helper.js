const userQueries = require('./users');
const orderQueries = require('./orders');
const positionQueries = require('./positions');
const otherQueries = require('./others');
// Eksportuj WSZYSTKO razem
module.exports = {
  ...positionQueries,
  ...otherQueries,
  ...userQueries,
  ...orderQueries
};