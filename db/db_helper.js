const userQueries = require('./users');
const orderQueries = require('./orders');
const positionQueries = require('./positions');
const otherQueries = require('./others');
const ownerQueries = require('./owner');
const statusesQueries = require('./statuses');
const addressQueries = require('./address');


module.exports = {
  ...positionQueries,
  ...otherQueries,
  ...userQueries,
  ...orderQueries,
  ...ownerQueries,
  ...statusesQueries,
  ...addressQueries
};