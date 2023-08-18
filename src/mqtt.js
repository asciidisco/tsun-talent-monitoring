const mqtt = require("mqtt");

const {
  PROJECT_NAME,
  PROJECT_VERSION,
  UPDATE_EVENT,
  DEFAULT_MQTT_HOMEASSISTANT_PREFIX,
  MQTT_TOPIC_IDENTIFIER,
} = require("./constants");

async function addMQTTInterface({ config, emitter, log }) {
  log.info(
    {
      host: config.mqtt.host,
      port: config.mqtt.port,
      auth: !!(config.mqtt.username && config.mqtt.password),
    },
    "Enabling MQTT interface"
  );
  const client = await connect({ config, emitter, log });
  emitter.on(
    UPDATE_EVENT,
    sendStateMessages.bind(null, { client, config, log })
  );
  return;
}

async function connect({ config, emitter, log }) {
  return new Promise(function __mqttConnectAndDiscover(resolve, reject) {
    const client = mqtt.connect({
      host: config.mqtt.host,
      port: config.mqtt.port,
      username: config.mqtt.user,
      password: config.mqtt.password,
      clientId: config.mqtt.clientId,
      connectTimeout: 10_000,
    });
    client.on("error", function __mqttConnectionError(error) {
      reject(error);
    });

    client.on("connect", function __mqttConnected() {
      log.info("Connected to MQTT Broker");
      emitter.once(
        UPDATE_EVENT,
        publishDiscovery.bind(null, { client, config, log })
      );
      resolve(client);
    });
  });
}

function publishDiscovery({ client, config, log }, data) {
  const discoverableDevices = {};
  // create discovery topics/messages for all inverter functionality
  for (const station of data) {
    for (const inverter of station.inverters) {
      discoverableDevices[inverter.guid] = {};

      // inverter power
      discoverableDevices[inverter.guid]["power"] = {
        device: getInverterDevicePayload(inverter, station),
        availability: getAvailabilityPayload(config),
        ...getInverterAttributePayload(inverter, "power", config),
        icon: "mdi:lightning-bolt",
        enabled_by_default: true,
        device_class: "POWER",
        unit_of_measurement: "W",
      };

      // daily generation
      discoverableDevices[inverter.guid]["daily_generation"] = {
        device: getInverterDevicePayload(inverter, station),
        availability: getAvailabilityPayload(config),
        ...getInverterAttributePayload(inverter, "daily_generation", config),
        icon: "mdi:lightning-bolt-outline",
        enabled_by_default: true,
        device_class: "ENERGY",
        unit_of_measurement: "Wh",
        state_class: "total",
        last_reset: getResetTime("day"),
      };

      // monthly generation
      discoverableDevices[inverter.guid]["monthly_generation"] = {
        device: getInverterDevicePayload(inverter, station),
        availability: getAvailabilityPayload(config),
        ...getInverterAttributePayload(inverter, "monthly_generation", config),
        icon: "mdi:home-lightning-bolt",
        enabled_by_default: true,
        device_class: "ENERGY",
        unit_of_measurement: "kWh",
        state_class: "total",
        last_reset: getResetTime("month"),
      };

      // monthly generation
      discoverableDevices[inverter.guid]["yearly_generation"] = {
        device: getInverterDevicePayload(inverter, station),
        availability: getAvailabilityPayload(config),
        ...getInverterAttributePayload(inverter, "yearly_generation", config),
        icon: "mdi:home-lightning-bolt-outline",
        enabled_by_default: true,
        device_class: "ENERGY",
        unit_of_measurement: "kWh",
        state_class: "total",
        last_reset: getResetTime("year"),
      };

      // inverter temperature
      discoverableDevices[inverter.guid]["device_temperature"] = {
        device: getInverterDevicePayload(inverter, station),
        availability: getAvailabilityPayload(config),
        ...getInverterAttributePayload(inverter, "device_temperature", config),
        icon: "mdi:thermometer",
        enabled_by_default: true,
        entity_category: "diagnostic",
        device_class: "TEMPERATURE",
        unit_of_measurement: "°C",
      };

      // inverter wifi signal strength
      discoverableDevices[inverter.guid]["wifi_signal_strength"] = {
        device: getInverterDevicePayload(inverter, station),
        availability: getAvailabilityPayload(config),
        ...getInverterAttributePayload(
          inverter,
          "wifi_signal_strength",
          config
        ),
        icon: "mdi:wifi",
        enabled_by_default: true,
        entity_category: "diagnostic",
        state_class: "measurement",
        unit_of_measurement: "%",
      };

      // inverter grid current
      discoverableDevices[inverter.guid]["grid_current"] = {
        device: getInverterDevicePayload(inverter, station),
        availability: getAvailabilityPayload(config),
        ...getInverterAttributePayload(inverter, "grid_current", config),
        icon: "mdi:flash-outline",
        enabled_by_default: true,
        device_class: "CURRENT",
        unit_of_measurement: "A",
      };

      // inverter grid voltage
      discoverableDevices[inverter.guid]["grid_voltage"] = {
        device: getInverterDevicePayload(inverter, station),
        availability: getAvailabilityPayload(config),
        ...getInverterAttributePayload(inverter, "grid_voltage", config),
        icon: "mdi:flash-triangle",
        enabled_by_default: true,
        device_class: "VOLTAGE",
        unit_of_measurement: "V",
      };

      // inverter grid frequency
      discoverableDevices[inverter.guid]["grid_frequency"] = {
        device: getInverterDevicePayload(inverter, station),
        availability: getAvailabilityPayload(config),
        ...getInverterAttributePayload(inverter, "grid_frequency", config),
        icon: "mdi:sine-wave",
        enabled_by_default: true,
        device_class: "FREQUENCY",
        unit_of_measurement: "Hz",
      };

      // inverter grid frequency
      discoverableDevices[inverter.guid]["last_seen"] = {
        device: getInverterDevicePayload(inverter, station),
        availability: getAvailabilityPayload(config),
        ...getInverterAttributePayload(inverter, "last_seen", config),
        icon: "mdi:clock",
        enabled_by_default: true,
        entity_category: "diagnostic",
        device_class: "timestamp",
      };

      // create discovery topics/messages for all solar panel functionality
      for (const panel of inverter.panels) {
        discoverableDevices[`${inverter.guid}_${panel.id}`] = {};
        // panel grid current
        discoverableDevices[`${inverter.guid}_${panel.id}`]["panel_current"] = {
          device: getPanelDevicePayload(panel, inverter, station, config),
          availability: getAvailabilityPayload(config),
          ...getPanelAttributePayload(panel, inverter, "panel_current", config),
          icon: "mdi:flash-outline",
          enabled_by_default: true,
          device_class: "CURRENT",
          unit_of_measurement: "A",
        };

        // panel grid voltage
        discoverableDevices[`${inverter.guid}_${panel.id}`]["panel_voltage"] = {
          device: getPanelDevicePayload(panel, inverter, station, config),
          availability: getAvailabilityPayload(config),
          ...getPanelAttributePayload(panel, inverter, "panel_voltage", config),
          icon: "mdi:flash-triangle",
          enabled_by_default: true,
          device_class: "VOLTAGE",
          unit_of_measurement: "V",
        };

        // panel grid frequency
        discoverableDevices[`${inverter.guid}_${panel.id}`]["panel_power"] = {
          device: getPanelDevicePayload(panel, inverter, station, config),
          availability: getAvailabilityPayload(config),
          ...getPanelAttributePayload(panel, inverter, "panel_power", config),
          icon: "mdi:lightning-bolt",
          enabled_by_default: true,
          device_class: "POWER",
          unit_of_measurement: "W",
        };

        // panel grid frequency
        discoverableDevices[`${inverter.guid}_${panel.id}`]["last_seen"] = {
          device: getPanelDevicePayload(panel, inverter, station, config),
          availability: getAvailabilityPayload(config),
          ...getPanelAttributePayload(panel, inverter, "last_seen", config),
          icon: "mdi:clock",
          enabled_by_default: true,
          entity_category: "diagnostic",
          device_class: "timestamp",
        };
      }
    }
  }

  sendOnlineState({ client, data, config, log });
  sendDiscoveryMessages({ discoverableDevices, client, config, log });
  setTimeout(function __delayMessageState() {
    sendStateMessages({ discoverableDevices, client, config, log }, data);
    setTimeout(function __resendInitialMessageState() {
      sendStateMessages({ client, config, log }, data);
      setTimeout(function __resendInitialMessageState() {
        sendStateMessages({ client, config, log }, data);
      }, 10_000);
    }, 10_000);
  }, 1000);
}

function sendOnlineState({ client, config, log }) {
  log.debug("Sending online state");
  for (const availability of getAvailabilityPayload(config)) {
    client.publish(availability.topic, "online");
  }
}

function sendDiscoveryMessages({ discoverableDevices, client, config, log }) {
  log.debug("Sending discovery messages");
  for (const deviceKey in discoverableDevices) {
    for (const entityKey in discoverableDevices[deviceKey]) {
      const topic = `${getDiscoveryTopicPrefix(config)}${
        discoverableDevices[deviceKey][entityKey].state_topic.split("/")[1]
      }/${entityKey}/config`;
      client.publish(
        topic,
        JSON.stringify(discoverableDevices[deviceKey][entityKey]),
        { retain: true }
      );
    }
  }
}

function sendStateMessages({ client, config, log }, data) {
  sendOnlineState({ client, config, log });
  log.debug("Sending state messages");
  // send state messages for all inverter functionality
  for (const station of data) {
    for (const inverter of station.inverters) {
      const inverterTopic = `${config.mqtt.topic}/${inverter.guid}`;
      client.publish(
        inverterTopic,
        JSON.stringify({
          power: inverter.power.active,
          daily_generation: inverter.power.today,
          monthly_generation: inverter.power.month,
          yearly_generation: inverter.power.year,
          device_temperature: inverter.temperature,
          wifi_signal_strength: station.wifiSignalStrength,
          grid_current: inverter.current,
          grid_voltage: inverter.voltage,
          grid_frequency: inverter.frequency,
          last_seen: station.timestamp,
        })
      );

      for (const panel of inverter.panels) {
        client.publish(
          `${config.mqtt.topic}/${inverter.guid}_${panel.id}`,
          JSON.stringify({
            panel_current: panel.current,
            panel_voltage: panel.voltage,
            panel_power: panel.power,
            last_seen: station.timestamp,
          })
        );
      }
    }
  }
}

function getDiscoveryTopicPrefix(config) {
  return `${config.mqtt.homeAssistantDiscoveryPrefix}/sensor/`;
}

function getInverterDevicePayload(inverter, powerStation) {
  const payload = {
    name: powerStation.name,
    identifiers: [inverter.serialNumber],
    sw_version: `${PROJECT_NAME} ${PROJECT_VERSION}`,
  };

  payload.model = inverter.model;
  payload.manufacturer = inverter.brand;
  payload.sw_version = inverter.firmwareVersion;

  return payload;
}

function getInverterAttributePayload(inverter, type, config) {
  const topic = `${config.mqtt.topic}/${inverter.guid}`;
  return {
    json_attributes_topic: topic,
    name: convertTypeToName(type),
    schema: "json",
    state_topic: topic,
    unique_id: `${inverter.guid}_inverter_${type}_${config.mqtt.topic}`,
    value_template: `{{ value_json.${type} }}`,
  };
}

function getPanelDevicePayload(panel, inverter, powerStation, config) {
  const payload = {
    name: `${powerStation.name} (${panel.id})`,
    identifiers: [`${inverter.guid}-${panel.id}`],
    sw_version: `${PROJECT_NAME} ${PROJECT_VERSION}`,
  };

  payload.model = config.device.model;
  payload.manufacturer = config.device.manufacturer;

  return payload;
}

function getPanelAttributePayload(panel, inverter, type, config) {
  const topic = `${config.mqtt.topic}/${inverter.guid}_${panel.id}`;
  return {
    json_attributes_topic: topic,
    name: convertTypeToName(type),
    schema: "json",
    state_topic: topic,
    unique_id: `${inverter.guid}_${panel.id}_panel_${type}_${config.mqtt.topic}`,
    value_template: `{{ value_json.${type} }}`,
  };
}

function getAvailabilityPayload(config) {
  return [{ topic: `${config.mqtt.topic}/bridge/state` }];
}

function convertTypeToName(type) {
  return type
    .split("_")
    .map((word) => {
      return word[0].toUpperCase() + word.substring(1);
    })
    .join(" ");
}

function getResetTime(item) {
  let time;
  if (item === "day") {
    time = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate() + 1,
      0,
      0,
      0,
      0
    );
  }

  if (item === "month") {
    time = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      2,
      0,
      0,
      0,
      0
    );
  }

  if (item === "year") {
    time = new Date(new Date().getFullYear(), 0, 2);
  }

  const timedArray = time.toISOString().split("T");
  const date = timedArray.shift();
  const trailing = timedArray.pop().split(":").pop();
  return `${date}T00:00:${trailing}`;
}

module.exports = {
  addMQTTInterface,
};
