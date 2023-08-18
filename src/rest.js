const { MemoryStorageManager } = require("./store");
const { MODULE_REST, REST_ROUTE_ENDPOINT } = require("./constants");

function addRestRoute(app, config) {
  const log = MemoryStorageManager.getLogger(MODULE_REST);
  log.info({ endpoint: config.rest.endpoint }, "Enabling REST interface");
  app.get(config.rest.endpoint, async (request, reply) => {
    return MemoryStorageManager.getPowerStationData();
  });
}

module.exports = {
  addRestRoute,
};
