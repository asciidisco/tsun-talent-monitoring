// PROJECT DEFAULTS
const PROJECT_NAME = "Talents monitoring";
const PROJECT_VERSION = "2023.8";
const DEFAULT_PORT = 3000;
const DEFAULT_LOG_LEVEL = "info";
const DEFAULT_TZ = "Europe/Berlin";

// EVENTS
const UPDATE_EVENT = "update";

// MODULES
const MODULE_CORE = "core";
const MODULE_SERVER = "server";
const MODULE_CONFIG = "config";
const MODULE_API = "api";
const MODULE_REST = "rest";
const MODULE_MQTT = "mqtt";
const MODULE_PROMETHEUS = "prometheus";

// DATA POLLING
const RUN_LOOP_INTERVAL = 300_000; // 300 seconds, 5 minutes

// LOCAL REST API
const REST_ENABLED = false;
const REST_ROUTE_ENDPOINT = "/power-station";

// LOCAL PROMETHEUS API
const PROMETHEUS_ENABLED = false;
const PROMETHEUS_INCLUDE_SERVICE = false;
const PROMETHEUS_INCLUDE_API = true;
const METRICS_ROUTE_ENDPOINT = "/metrics";
const INVERTER_LABEL = "serialno";
const PANEL_LABEL = "panelid";

// LOCAL MQTT API
const MQTT_ENABLED = false;
const MQTT_PORT = 1883;
const DEFAULT_MQTT_HOMEASSISTANT_PREFIX = "homeassistant";
const MQTT_TOPIC_IDENTIFIER = "talents2mqtt";
const MQTT_CLIENT_IDENTIFIER = "talents2mqtt";

// DEVICE INFO
const DEVICE_PANEL_MANUFACTURER = "unknown";
const DEVICE_PANEL_MODEL = "unknown";

// TALENTS API
const NVRT_ID_PLACEHOLDER = "INVERTER_GUID";
const ACCESS_TOKEN_PLACEHOLDER = "ACCESS_TOKEN";
const PWR_STATION_ID_PLACEHOLDER = "POWER_STATION_GUID";
const BASE_URL = "https://www.talent-monitoring.com/prod-api";
const LOGIN_URL = "/login";
const INFO_URL = "/getInfo";
const POWER_STATION_URL =
  "/system/station/list?pageNum=1&pageSize=10&businessType=1&status=&searchOr=";
const INVERTER_URL = `/tools/device/selectDeviceInverter?searchOr=&status=&deviceTypeEn=inverter&powerStationGuid=${PWR_STATION_ID_PLACEHOLDER}&businessType=0&pageNum=1&pageSize=10&model=&firmware_version1=&firmware_version2=&firmware_version3=&firmware_version4=`;
const INVERTER_DETAILS_URL = `/tools/device/selectDeviceInverterInfo?deviceGuid=${NVRT_ID_PLACEHOLDER}&timezone=%2B02%3A00`;
const INVERTER_WIFI_URL =
  "/tools/device/selectDeviceCollector?searchOr=&status=&isEntity=1&deviceTypeEn=collector&businessType=0&pageNum=1&pageSize=50&firmware_version=";
const REQUEST_RETRIES = 3;
const REQUEST_RETRY_WAITING_PERIOD = 5_000; // 5 seconds

const GET_REQUEST_OPTIONS = {
  method: "GET",
  redirect: "follow",
  headers: {
    "Content-Type": "application/json;charset=utf-8",
    authorization: `Bearer ${ACCESS_TOKEN_PLACEHOLDER}`,
  },
};

module.exports = {
  PROJECT_NAME,
  PROJECT_VERSION,
  DEFAULT_PORT,
  DEFAULT_TZ,
  DEFAULT_LOG_LEVEL,
  UPDATE_EVENT,
  MODULE_CORE,
  MODULE_SERVER,
  MODULE_CONFIG,
  MODULE_API,
  MODULE_REST,
  MODULE_MQTT,
  MODULE_PROMETHEUS,
  RUN_LOOP_INTERVAL,
  REST_ENABLED,
  REST_ROUTE_ENDPOINT,
  PROMETHEUS_ENABLED,
  PROMETHEUS_INCLUDE_SERVICE,
  PROMETHEUS_INCLUDE_API,
  METRICS_ROUTE_ENDPOINT,
  INVERTER_LABEL,
  PANEL_LABEL,
  MQTT_ENABLED,
  MQTT_PORT,
  MQTT_CLIENT_IDENTIFIER,
  DEFAULT_MQTT_HOMEASSISTANT_PREFIX,
  MQTT_TOPIC_IDENTIFIER,
  DEVICE_PANEL_MANUFACTURER,
  DEVICE_PANEL_MODEL,
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
};
