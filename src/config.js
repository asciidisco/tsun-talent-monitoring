const {
  DEFAULT_PORT,
  DEFAULT_TZ,
  DEFAULT_LOG_LEVEL,
  MQTT_ENABLED,
  MQTT_PORT,
  MQTT_CLIENT_IDENTIFIER,
  MQTT_TOPIC_IDENTIFIER,
  DEFAULT_MQTT_HOMEASSISTANT_PREFIX,
  REST_ENABLED,
  REST_ROUTE_ENDPOINT,
  PROMETHEUS_ENABLED,
  METRICS_ROUTE_ENDPOINT,
  PROMETHEUS_INCLUDE_API,
  PROMETHEUS_INCLUDE_SERVICE,
  DEVICE_PANEL_MANUFACTURER,
  DEVICE_PANEL_MODEL,
} = require("./constants");

const configurationDefaults = {
  server: {
    port: DEFAULT_PORT,
    loglevel: DEFAULT_LOG_LEVEL,
    tz: DEFAULT_TZ,
  },
  api: {
    username: null,
    password: null,
  },
  mqtt: {
    enabled: MQTT_ENABLED,
    host: null,
    port: MQTT_PORT,
    user: null,
    password: null,
    topic: MQTT_TOPIC_IDENTIFIER,
    clientId: MQTT_CLIENT_IDENTIFIER,
    homeAssistantDiscoveryPrefix: DEFAULT_MQTT_HOMEASSISTANT_PREFIX,
  },
  rest: {
    enabled: REST_ENABLED,
    endpoint: REST_ROUTE_ENDPOINT,
  },
  prometheus: {
    enabled: PROMETHEUS_ENABLED,
    endpoint: METRICS_ROUTE_ENDPOINT,
    serviceMetrics: PROMETHEUS_INCLUDE_SERVICE,
    talentsData: PROMETHEUS_INCLUDE_API,
  },
  device: {
    manufacturer: DEVICE_PANEL_MANUFACTURER,
    model: DEVICE_PANEL_MODEL,
  },
};

function loadServer(server) {
  if (process.env.TZ) {
    server.tz = process.env.TZ;
  }

  if (process.env.SERVER_PORT)
    server.port = parseInt(process.env.SERVER_PORT, 10);
  if (process.env.LOG_LEVEL)
    server.loglevel = (process.env.LOG_LEVEL + "").toLowerCase();
  return server;
}

function loadApi(api) {
  if (process.env.API_USERNAME)
    api.username = (process.env.API_USERNAME + "").trim();
  if (process.env.API_PASSWORD)
    api.password = (process.env.API_PASSWORD + "").trim();
  return api;
}

function loadMQTT(mqtt) {
  if (process.env.MQTT_ENABLED) {
    mqtt.enabled = !(
      (process.env.MQTT_ENABLED + "").trim().toLowerCase() === "false"
    );
  }

  if (process.env.MQTT_HOST) mqtt.host = (process.env.MQTT_HOST + "").trim();
  if (process.env.MQTT_PORT) mqtt.port = parseInt(process.env.MQTT_PORT, 10);
  if (process.env.MQTT_USERNAME)
    mqtt.user = (process.env.MQTT_USERNAME + "").trim();
  if (process.env.MQTT_PASSWORD)
    mqtt.password = (process.env.MQTT_PASSWORD + "").trim();
  if (process.env.MQTT_CLIENTID)
    mqtt.clientId = (process.env.MQTT_CLIENTID + "").trim();
  if (process.env.MQTT_BASE_TOPIC)
    mqtt.topic = (process.env.MQTT_BASE_TOPIC + "").trim();
  if (process.env.MQTT_HOMEASSISTANT_DISCOVERY_PREFIX)
    mqtt.homeAssistantDiscoveryPrefix = (
      process.env.MQTT_HOMEASSISTANT_DISCOVERY_PREFIX + ""
    ).trim();

  return mqtt;
}

function loadRest(rest) {
  if (process.env.REST_ENABLED) {
    rest.enabled = !(
      (process.env.REST_ENABLED + "").trim().toLowerCase() === "false"
    );
  }

  if (process.env.REST_ENDPOINT) rest.endpoint = process.env.REST_ENDPOINT + "";
  if (rest.endpoint.trim().length > 0 && !rest.endpoint.startsWith("/")) {
    rest.endpoint = `/${rest.endpoint}`;
  }
  return rest;
}

function loadPrometheus(prometheus) {
  if (process.env.PROMETHEUS_ENABLED) {
    prometheus.enabled = !(
      (process.env.PROMETHEUS_ENABLED + "").trim().toLowerCase() === "false"
    );
  }
  if (process.env.PROMETHEUS_ENDPOINT) prometheus.endpoint + "";
  if (process.env.PROMETHEUS_INCLUDE_SERVICE) !!prometheus.serviceMetrics;
  if (process.env.PROMETHEUS_INCLUDE_API) !!prometheus.talentsData;
  if (
    prometheus.endpoint.trim().length > 0 &&
    !prometheus.endpoint.startsWith("/")
  ) {
    prometheus.endpoint = `/${prometheus.endpoint}`;
  }
  return prometheus;
}

function loadDevice(device) {
  if (process.env.DEVICE_PANEL_MANUFACTURER)
    device.manufacturer = (process.env.DEVICE_PANEL_MANUFACTURER + "").trim();
  if (process.env.DEVICE_PANEL_MODEL)
    device.model = (process.env.DEVICE_PANEL_MODEL + "").trim();
  return device;
}

function loadConfiguration() {
  const config = Object.assign({}, configurationDefaults);
  config.server = loadServer(config.server);
  config.api = loadApi(config.api);
  config.mqtt = loadMQTT(config.mqtt);
  config.rest = loadRest(config.rest);
  config.prometheus = loadPrometheus(config.prometheus);
  config.device = loadDevice(config.device);
  return config;
}

function validateServer(server, log) {
  let isValid = true;
  if (!Number.isInteger(server.port)) {
    log.error("SERVER_PORT is not a valid integer");
    isValid = false;
  }
  if (
    !{ fatal: 1, error: 1, warn: 1, info: 1, debug: 1, trace: 1, silent: 1 }[
      server.loglevel
    ]
  ) {
    log.warn(
      "LOG_LEVEL is not set to 'fatal', 'error', 'warn', 'info', 'debug', 'trace' or 'silent'; defaulting to 'info'"
    );
  }
  return isValid;
}

function validateApi(api, log) {
  let isValid = true;
  if (api.username !== null && api.username.trim().length === 0) {
    log.error("API_USERNAME is set to an empty string");
    isValid = false;
  }
  if (api.username !== null && api.password.trim().length === 0) {
    log.error("API_PASSWORD is set to an empty string");
    isValid = false;
  }
  return isValid;
}

function validateMQTT(mqtt, log) {
  if (mqtt.enabled === false) return true;
  let isValid = true;
  if (!Number.isInteger(mqtt.port)) {
    log.error("MQTT_PORT is not a valid integer");
    isValid = false;
  }
  if (mqtt.host.trim().length === 0) {
    log.error("MQTT_URL is set to an empty string");
    isValid = false;
  }

  if (mqtt.topic.trim().length === 0) {
    log.error("MQTT_TOPIC_IDENTIFIER is set to an empty string");
    isValid = false;
  }

  if (mqtt.clientId.trim().length === 0) {
    log.error("MQTT_CLIENT_IDENTIFIER is set to an empty string");
    isValid = false;
  }

  if (mqtt.homeAssistantDiscoveryPrefix.trim().length === 0) {
    log.error("MQTT_HOMEASSISTANT_DISCOVERY_PREFIX is set to an empty string");
    isValid = false;
  }

  return true;
}

function validateRest(rest, log) {
  let isValid = true;
  if (rest.enabled === true && rest.endpoint.trim().length === 0) {
    log.error("REST_ENDPOINT is set to an empty string");
    isValid = false;
  }
  return isValid;
}

function validatePrometheus(prometheus, log) {
  if (prometheus.enabled === false) return true;
  let isValid = true;
  if (prometheus.endpoint.trim().length === 0) {
    log.error("PROMETHEUS_ENDPOINT is set to an empty string");
    isValid = false;
  }
  if (prometheus.talentsData === false && prometheus.serviceMetrics === false) {
    log.error(
      "Prometheus is enabled but PROMETHEUS_INCLUDE_SERVICE and PROMETHEUS_INCLUDE_API are set to 'false', resulting in empty prometheus output"
    );
    isValid = false;
  }
  return isValid;
}

function validateDevice(device, log) {
  let isValid = true;
  if (device.manufacturer.trim().length === 0) {
    log.error("DEVICE_PANEL_MANUFACTURER is set to an empty string");
    isValid = false;
  }
  if (device.model.trim().length === 0) {
    log.error("DEVICE_PANEL_MODEL is set to an empty string");
    isValid = false;
  }
  return isValid;
}

function validateConfiguration(config, log) {
  let validations = [];
  validations.push(validateServer(config.server, log));
  validations.push(validateApi(config.api, log));
  validations.push(validateMQTT(config.mqtt, log));
  validations.push(validateRest(config.rest, log));
  validations.push(validatePrometheus(config.prometheus, log));
  validations.push(validateDevice(config.device, log));

  if (
    config.mqtt.enabled !== true &&
    config.rest.enabled !== true &&
    config.prometheus.enabled !== true
  ) {
    log.warn(
      "You have not activated any of the touchpoints (rest, prometheus, mqtt), so there's nothing todo for the system"
    );
  }

  return validations.every(Boolean);
}

module.exports = {
  loadConfiguration,
  validateConfiguration,
};
