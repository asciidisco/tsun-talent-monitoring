const EventEmitter = require("node:events");

const pino = require("pino");
const fastify = require("fastify");
const healthCheckPlugin = require("fastify-healthcheck");

const { addRestRoute } = require("./rest");
const { requestPowerData } = require("./api");
const { addMQTTInterface } = require("./mqtt");
const { MemoryStorageManager } = require("./store");
const { addPrometheusInterface } = require("./prometheus");
const { loadConfiguration, validateConfiguration } = require("./config");
const {
  PROJECT_NAME,
  PROJECT_VERSION,
  UPDATE_EVENT,
  MODULE_CORE,
  MODULE_SERVER,
  MODULE_CONFIG,
  MODULE_API,
  MODULE_REST,
  MODULE_MQTT,
  MODULE_PROMETHEUS,
  RUN_LOOP_INTERVAL,
} = require("./constants");

function bootstrap() {
  const log = configureLogger();
  const config = loadConfiguration();
  // validate the configuration
  const configurationIsValid = validateConfiguration(
    config,
    log.child({ module: MODULE_CONFIG })
  );
  if (configurationIsValid !== true) {
    log.fatal("Configuration is invalid. Exiting.");
    process.exit(1);
  }

  const emitter = registerEventEmitter(
    MemoryStorageManager.getLogger(MODULE_SERVER)
  );
  const app = configureWebServer(
    MemoryStorageManager.getLogger(MODULE_SERVER),
    config
  );

  log.info({ version: PROJECT_VERSION }, `Starting ${PROJECT_NAME}`);
  return { app, config, emitter, log };
}

function registerEventEmitter(log) {
  class ApiDataEmitter extends EventEmitter {}
  const emitter = new ApiDataEmitter();
  MemoryStorageManager.setEventEmitter(emitter);
  log.debug("Registering internal EventEmitter");
  return emitter;
}

async function startScheduler(config) {
  const emitter = MemoryStorageManager.getEventEmitter();
  const data = await requestPowerData(config);
  MemoryStorageManager.setPowerStationData(data);
  emitter.emit(UPDATE_EVENT, data);

  // Schedule 2nd fetch before starting the interval
  const b = data[0].timestamp.split(/\D+/);
  const diffTime = Math.abs(
    new Date(Date.UTC(b[0], b[1] - 1, b[2], b[3], b[4], b[5], b[6])) -
      new Date()
  );

  setTimeout(async function __sndRequest() {
    const data = await requestPowerData(config);
    MemoryStorageManager.setPowerStationData(data);
    emitter.emit(UPDATE_EVENT, data);
    setInterval(async function __requestCycle() {
      const data = await requestPowerData(config);
      MemoryStorageManager.setPowerStationData(data);
      emitter.emit(UPDATE_EVENT, data);
    }, RUN_LOOP_INTERVAL);
  }, RUN_LOOP_INTERVAL - diffTime + 25_000);

  MemoryStorageManager.getLogger(MODULE_CORE).info(
    `Started API scheduler with poll rate of ${
      RUN_LOOP_INTERVAL / 1000
    } seconds`
  );
}

function configureLogger(config) {
  const baseLogger = pino({
    name: PROJECT_NAME,
    level:
      typeof process.env.LOG_LEVEL === "undefined"
        ? "info"
        : process.env.LOG_LEVEL.trim().toLowerCase(),
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  });
  const coreLogger = baseLogger.child({ module: MODULE_CORE });

  MemoryStorageManager.setLogger(coreLogger);
  MemoryStorageManager.setLogger(coreLogger, MODULE_CORE);
  MemoryStorageManager.setLogger(
    baseLogger.child({ module: MODULE_SERVER }),
    MODULE_SERVER
  );
  MemoryStorageManager.setLogger(
    baseLogger.child({ module: MODULE_CONFIG }),
    MODULE_CONFIG
  );
  MemoryStorageManager.setLogger(
    baseLogger.child({ module: MODULE_API }),
    MODULE_API
  );
  MemoryStorageManager.setLogger(
    baseLogger.child({ module: MODULE_REST }),
    MODULE_REST
  );
  MemoryStorageManager.setLogger(
    baseLogger.child({ module: MODULE_MQTT }),
    MODULE_MQTT
  );
  MemoryStorageManager.setLogger(
    baseLogger.child({ module: MODULE_PROMETHEUS }),
    MODULE_PROMETHEUS
  );

  return coreLogger;
}

function configureWebServer(logger) {
  const app = fastify({
    logger,
  });
  app.register(healthCheckPlugin);
  logger.debug("Configuring Webserver");
  return app;
}

async function startRestServer(app, port) {
  try {
    await app.listen({ port, host: "0.0.0.0" });
    app.log.info(
      `Available Routes:\n${app
        .printRoutes()
        .replace(/└──/g, "")
        .replace(/\n/g, "")
        .replace(/├──/g, "")}`
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

(async function main() {
  // bootstrap config, logger & http server
  const { app, config, emitter, log } = bootstrap();

  // enable rest interface if configured
  if (config.rest.enabled === true) {
    try {
      addRestRoute(app, config);
    } catch (error) {
      MemoryStorageManager.getLogger(MODULE_REST).fatal(
        error,
        "Could not setup Rest integration"
      );
      process.exit(1);
    }
  }

  // enable prometheus interface if configured
  if (config.prometheus.enabled === true) {
    try {
      await addPrometheusInterface(app, config);
    } catch (error) {
      MemoryStorageManager.getLogger(MODULE_PROMETHEUS).fatal(
        error,
        "Could not setup Prometheus integration"
      );
      process.exit(1);
    }
  }

  // enable MQTT interface if configured
  if (config.mqtt.enabled === true) {
    try {
      await addMQTTInterface({
        config,
        emitter,
        log: MemoryStorageManager.getLogger(MODULE_MQTT),
      });
    } catch (error) {
      MemoryStorageManager.getLogger(MODULE_MQTT).fatal(
        error,
        "Could not establish MQTT connection"
      );
      process.exit(1);
    }
  }

  // start the api polling scheduler
  try {
    await startScheduler(config);
  } catch (error) {
    MemoryStorageManager.getLogger(MODULE_API).fatal(
      error,
      "Could not establish API scheduler"
    );
    process.exit(1);
  }

  // start the webserver regardless of the REST & Prometheus configuration, so that
  // at least the healthchecks are available
  startRestServer(app, config.server.port);
})().catch(function __reportBootstrapError(error) {
  // log error and exit
  try {
    MemoryStorageManager.getLogger(MODULE_CORE).fatal(
      error,
      "Error while bootstrapping the application"
    );
  } catch (_) {
    console.error(error);
  }
  process.exit(1);
});
