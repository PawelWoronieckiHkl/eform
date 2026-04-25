const userQueries = require('./users');
const orderQueries = require('./orders');
const positionQueries = require('./positions');
const otherQueries = require('./others');
const ownerQueries = require('./owner');
const statusesQueries = require('./statuses');
const addressQueries = require('./address');
const groupQueries = require('./group');


module.exports = {
  ...positionQueries,
  ...otherQueries,
  ...userQueries,
  ...orderQueries,
  ...ownerQueries,
  ...statusesQueries,
  ...addressQueries,
  ...groupQueries
};