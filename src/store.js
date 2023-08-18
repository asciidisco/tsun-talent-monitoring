class MemoryStorageManager {
  static LOGGER = {};
  static EMITTER = null;
  static ACCESS_TOKEN = null;
  static POWER_STATION_DATA = {};
  static setLogger(logger, type = "default") {
    MemoryStorageManager.LOGGER[type] = logger;
  }
  static getLogger(type = "default") {
    return (
      MemoryStorageManager.LOGGER[type] ?? MemoryStorageManager.LOGGER.default
    );
  }
  static setEventEmitter(eventemitter) {
    MemoryStorageManager.EMITTER = eventemitter;
  }
  static getEventEmitter() {
    return MemoryStorageManager.EMITTER;
  }
  static setAccessToken(accessToken) {
    MemoryStorageManager.ACCESS_TOKEN = accessToken;
  }
  static getAccessToken() {
    return MemoryStorageManager.ACCESS_TOKEN;
  }
  static setPowerStationData(data) {
    MemoryStorageManager.POWER_STATION_DATA = data;
  }
  static getPowerStationData() {
    return MemoryStorageManager.POWER_STATION_DATA;
  }
}

module.exports = {
  MemoryStorageManager,
};
