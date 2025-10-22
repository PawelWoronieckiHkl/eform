const userQueries = require('./users');
const orderQueries = require('./orders');
const positionQueries = require('./positions');
const otherQueries = require('./others');
const ownerQueries = require('./owner');
// Eksportuj WSZYSTKO razem
module.exports = {
  ...positionQueries,
  ...otherQueries,
  ...userQueries,
  ...orderQueries,
  ...ownerQueries
};