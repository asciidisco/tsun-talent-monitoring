const { randomUUID } = require("node:crypto");

const { MemoryStorageManager } = require("./store");
const {
  MODULE_API,
  NVRT_ID_PLACEHOLDER,
  ACCESS_TOKEN_PLACEHOLDER,
  PWR_STATION_ID_PLACEHOLDER,
  BASE_URL,
  LOGIN_URL,
  INFO_URL,
  POWER_STATION_URL,
  INVERTER_URL,
  INVERTER_DETAILS_URL,
  INVERTER_WIFI_URL,
  REQUEST_RETRIES,
  REQUEST_RETRY_WAITING_PERIOD,
  GET_REQUEST_OPTIONS,
} = require("./constants");

function retryableFetch(url, options = {}, retries) {
  const log = MemoryStorageManager.getLogger(MODULE_API);
  return fetch(url, options).then((res) => {
    if (res.ok) {
      return res.json();
    }
    if (retries > 0) {
      log.warn(
        { url, retries },
        `Retrying failed request in ${
          REQUEST_RETRY_WAITING_PERIOD / 1000
        } seconds`
      );
      return new Promise(function __requestRetry(resolve) {
        setTimeout(function __retryRequest() {
          log.warn({ url, retries }, "Retrying request");
          resolve(retryableFetch(url, options, retries - 1));
        }, REQUEST_RETRY_WAITING_PERIOD);
      });
    }
    throw new Error(`Message: '${res.text()}' - Status: '${res.status}'`);
  });
}

function getRequestOptions(accessToken) {
  const requestOptions = Object.assign({}, GET_REQUEST_OPTIONS);
  requestOptions.headers.authorization =
    requestOptions.headers.authorization.replace(
      ACCESS_TOKEN_PLACEHOLDER,
      accessToken
    );
  return requestOptions;
}

async function login(username, password) {
  const url = BASE_URL + LOGIN_URL;
  const log = MemoryStorageManager.getLogger(MODULE_API);
  const loginData = {
    username,
    password,
    uuid: randomUUID(),
  };

  const requestOptions = {
    method: "POST",
    body: JSON.stringify(loginData),
    redirect: "follow",
    headers: {
      "Content-Type": "application/json;charset=utf-8",
    },
  };

  log.debug({ url }, "Requesting access token");

  let responseBody;
  try {
    responseBody = await retryableFetch(url, requestOptions, REQUEST_RETRIES);
  } catch (error) {
    log.error(
      error,
      "Could not Login, either bad credentials or the remote endpoint isn't available"
    );
    return null;
  }
  return responseBody.token;
}

async function checkAccessToken(accessToken) {
  const url = BASE_URL + INFO_URL;
  const log = MemoryStorageManager.getLogger(MODULE_API);
  const requestOptions = getRequestOptions(accessToken);

  log.debug({ url }, "Verifying access token");

  let responseBody;
  try {
    responseBody = await retryableFetch(url, requestOptions, REQUEST_RETRIES);
  } catch (error) {
    log.error(error, "Could not verify access_token");
    return false;
  }
  return responseBody.code === 200;
}

async function getPowerStations(accessToken) {
  const url = BASE_URL + POWER_STATION_URL;
  const log = MemoryStorageManager.getLogger(MODULE_API);
  const requestOptions = getRequestOptions(accessToken);

  log.debug({ url }, "Requesting power stations");

  let responseBody;
  try {
    responseBody = await retryableFetch(url, requestOptions, REQUEST_RETRIES);
  } catch (error) {
    log.error(error, "Could not get power stations");
    return [];
  }
  return responseBody.rows;
}

async function getInverter(accessToken, powerStationId) {
  const url =
    BASE_URL + INVERTER_URL.replace(PWR_STATION_ID_PLACEHOLDER, powerStationId);
  const log = MemoryStorageManager.getLogger(MODULE_API);
  const requestOptions = getRequestOptions(accessToken);

  log.debug({ url }, "Requesting inverter devices");

  let responseBody;
  try {
    responseBody = await retryableFetch(url, requestOptions, REQUEST_RETRIES);
  } catch (error) {
    log.error(error, "Could not get inverter devices");
    return [];
  }
  return responseBody.rows;
}

async function getInverterData(accessToken, inverterId) {
  const url =
    BASE_URL + INVERTER_DETAILS_URL.replace(NVRT_ID_PLACEHOLDER, inverterId);
  const log = MemoryStorageManager.getLogger(MODULE_API);
  const requestOptions = getRequestOptions(accessToken);

  log.debug({ url }, "Requesting inverter data");

  let responseBody;
  try {
    responseBody = await retryableFetch(url, requestOptions, REQUEST_RETRIES);
  } catch (error) {
    log.error(error, "Could not get inverter data");
    return [];
  }
  return responseBody.data;
}

async function getInverterWiFiSignal(accessToken) {
  const url = BASE_URL + INVERTER_WIFI_URL;
  const log = MemoryStorageManager.getLogger(MODULE_API);
  const requestOptions = getRequestOptions(accessToken);

  log.debug({ url }, "Requesting inverter wifi signal data");

  let responseBody;
  try {
    responseBody = await retryableFetch(url, requestOptions, REQUEST_RETRIES);
  } catch (error) {
    log.error(error, "Could not get inverter wifi signal data");
    return [];
  }
  return responseBody.rows;
}

function convertTZ(date) {
  const b = date.split(/\D+/);
  return new Date(
    Date.UTC(b[0], --b[1], b[2], b[3] - 2, b[4], b[5], b[6])
  ).toISOString();
}

function sanitizeData(
  powerStations,
  inverters,
  inverterData,
  inverterWifiData,
  config
) {
  const sanitizedData = [];

  // power station data template
  const powerStation = {
    guid: null,
    online: false,
    power: {
      active: 0,
      today: 0,
      month: 0,
      year: 0,
    },
    name: "unknown",
    serialNumber: null,
    timestamp: new Date().toISOString("yyyy-MM-dd'T'HH:mm:ss"),
    numberOfPanels: null,
    numberOfInverters: null,
    inverters: [],
  };

  // inverter data template
  const inverter = {
    guid: null,
    online: false,
    numberOfPanels: null,
    firmwareVersion: null,
    ratedPower: null,
    serialNumber: null,
    model: null,
    power: {
      active: 0,
      today: 0,
      month: 0,
      year: 0,
    },
    current: 0,
    voltage: 0,
    frequency: 0,
    temperature: 0,
    panels: [],
  };

  // solar panel data template
  const panel = {
    id: null,
    current: null,
    power: null,
    voltage: null,
  };

  const signalPerStation = {};
  inverterWifiData.forEach(function __mapWifiSignalToStation(row) {
    signalPerStation[row.powerStationGuid] = row.signalStrength;
  });

  for (const powerStationRaw of powerStations) {
    const currentStation = Object.assign({}, powerStation);
    currentStation.guid = powerStationRaw.powerStationGuid;
    currentStation.name = powerStationRaw.stationName;
    currentStation.wifiSignalStrength = signalPerStation[currentStation.guid];

    for (const inverterRaw of inverters) {
      for (const inverterInstance of inverterRaw) {
        if (inverterInstance.powerStationGuid === currentStation.guid) {
          const currentInverter = Object.assign({}, inverter);
          currentInverter.guid = inverterInstance.deviceGuid;
          currentInverter.serialNumber = inverterInstance.serialNumber;
          currentStation.serialNumber = inverterInstance.parentSerialNumber;
          currentStation.timestamp = convertTZ(
            inverterInstance.lastDataUpdateTimeOffseted + ".000Z",
            config.server.tz
          );
          currentStation.power.active += inverterInstance.phaseAActivePower;
          if (inverterInstance.statusNamed === "Online") {
            currentStation.online = true;
            currentInverter.online = true;
          }

          for (const inverterDataRaw of inverterData) {
            if (inverterDataRaw.deviceGuid === currentInverter.guid) {
              currentInverter.power.active = inverterDataRaw.phaseAActivePower;
              currentInverter.power.today = inverterDataRaw.energyToday;
              currentInverter.power.month = parseFloat(
                inverterDataRaw.monthEnergyNamed.split(" ")[0],
                10
              );
              currentInverter.power.year = parseFloat(
                inverterDataRaw.yearEnergyNamed.split(" ")[0],
                10
              );

              currentStation.power.today += inverterDataRaw.energyToday;
              currentStation.power.month += currentInverter.power.month;
              currentStation.power.year += currentInverter.power.year;

              currentInverter.firmwareVersion = `${inverterDataRaw.firmwareVersion1} (${inverterDataRaw.firmwareVersion2}/${inverterDataRaw.firmwareVersion3})`;
              currentInverter.ratedPower = inverterDataRaw.ratedPower;
              currentInverter.brand = inverterDataRaw.brandEn;
              currentInverter.model = inverterDataRaw.model;

              currentInverter.temperature = inverterDataRaw.inverterTemp;
              currentInverter.current = inverterDataRaw.phaseACurrent;
              currentInverter.voltage = inverterDataRaw.phaseAVoltage;
              currentInverter.frequency = inverterDataRaw.phaseAFrequency;

              for (const pv of inverterDataRaw.pv) {
                if (pv.current !== 0 && pv.current !== null) {
                  const currentPanel = Object.assign({}, panel);
                  currentPanel.id = pv.key;
                  currentPanel.current = pv.current;
                  currentPanel.power = pv.power;
                  currentPanel.voltage = pv.voltage;
                  currentInverter.panels.push(currentPanel);
                }
              }
            }
          }
          currentInverter.numberOfPanels = currentInverter.panels.length;
          currentStation.numberOfPanels += currentInverter.numberOfPanels;

          currentStation.inverters.push(currentInverter);
          currentStation.numberOfInverters += 1;
        }
      }
    }

    sanitizedData.push(currentStation);
  }

  return sanitizedData;
}

async function requestPowerData(config) {
  MemoryStorageManager.getLogger(MODULE_API).info("Requesting API data");
  // check if we already have an access token, if not, login
  if (MemoryStorageManager.getAccessToken() === null) {
    MemoryStorageManager.setAccessToken(
      await login(config.api.username, config.api.password)
    );
  }
  // check if the access token is valid, if not, login to get a fresh one
  const accessTokenIsValid = await checkAccessToken(
    MemoryStorageManager.getAccessToken()
  );
  if (!accessTokenIsValid) {
    MemoryStorageManager.setAccessToken(
      await login(config.api.username, config.api.password)
    );
  }

  // get all registered power stations, can be multiple ones per account
  const powerStations = await getPowerStations(
    MemoryStorageManager.getAccessToken()
  );

  // get all inverters which are child devices of power stations
  let inverterFutures = [];
  for (const powerStation of powerStations) {
    inverterFutures.push(
      getInverter(
        MemoryStorageManager.getAccessToken(),
        powerStation.powerStationGuid
      )
    );
  }
  const inverters = await Promise.all(inverterFutures);

  // get detailed data on inverters & solar panels attached to them
  let inverterDataFutures = [];
  for (const inverter of inverters) {
    inverterDataFutures = inverter.map(function (row) {
      return getInverterData(
        MemoryStorageManager.getAccessToken(),
        row.deviceGuid
      );
    });
  }
  const invertData = await Promise.all(inverterDataFutures);
  const inverterWifiData = await getInverterWiFiSignal(
    MemoryStorageManager.getAccessToken()
  );

  // sanitize the data, e.g.:
  // convert values to be uniform,
  // create a hierarchical data structure
  // remove unecessary or duplicate data
  return sanitizeData(
    powerStations,
    inverters,
    invertData,
    inverterWifiData,
    config
  );
}

module.exports = {
  requestPowerData,
};
