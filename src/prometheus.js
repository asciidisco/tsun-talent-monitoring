const metricsPlugin = require("fastify-metrics");

const { MemoryStorageManager } = require("./store");
const {
  UPDATE_EVENT,
  METRICS_ROUTE_ENDPOINT,
  INVERTER_LABEL,
  PANEL_LABEL,
} = require("./constants");

const inverterActiveTmpl = {
  name: "inverter_active_power",
  help: "active power measured in Watt",
  labelNames: [INVERTER_LABEL],
};
const inverterDayTmpl = {
  name: "inverter_daily_generation",
  help: "energy generated today measured in Wh",
  labelNames: [INVERTER_LABEL],
};
const inverterMonthTmpl = {
  name: "inverter_monthly_generation",
  help: "energy generated this month measured in kWh",
  labelNames: [INVERTER_LABEL],
};
const inverterYearTmpl = {
  name: "inverter_yearly_generation",
  help: "energy generated this year measured in kWh",
  labelNames: [INVERTER_LABEL],
};
const inverterTempTmpl = {
  name: "inverter_temperature",
  help: "inverter temperature measured in degrees celsius",
  labelNames: [INVERTER_LABEL],
};
const inverterCurrentTmpl = {
  name: "inverter_current",
  help: "grid current measured in Ampere",
  labelNames: [INVERTER_LABEL],
};
const inverterVoltageTmpl = {
  name: "inverter_voltage",
  help: "grid voltage measured in Volt",
  labelNames: [INVERTER_LABEL],
};
const inverterFrequencyTmpl = {
  name: "inverter_frequency",
  help: "grid frequency measured in Hz",
  labelNames: [INVERTER_LABEL],
};
const inverterWifiTmpl = {
  name: "inverter_wifi_signal_strength",
  help: "inverter WiFi signal strength measured in %",
  labelNames: [INVERTER_LABEL],
};

const panelActiveTmpl = {
  name: "panel_active_power",
  help: "solar panel active power measured in Watt",
  labelNames: [PANEL_LABEL],
};
const panelCurrentTmpl = {
  name: "panel_current",
  help: "solar panel current measured in Ampere",
  labelNames: [PANEL_LABEL],
};
const panelVoltageTmpl = {
  name: "panel_voltage",
  help: "solar panel voltage measured in Volt",
  labelNames: [PANEL_LABEL],
};

async function addPrometheusInterface(app, config) {
  const emitter = MemoryStorageManager.getEventEmitter();

  await app.register(metricsPlugin, {
    endpoint: config.prometheus.endpoint,
  });
  if (!config.prometheus.serviceMetrics) app.metrics.client.register.clear();

  if (config.prometheus.talentsData) {
    const gauges = registerTalentsGauges({ client: app.metrics.client });
    registerUpdater({ emitter, gauges });
  }
}

function registerTalentsGauges({ client }) {
  const gauges = {};
  // create gauges for all inverter functionality
  // active power
  gauges[inverterActiveTmpl.name] = new client.Gauge(inverterActiveTmpl);
  // daily generation
  gauges[inverterDayTmpl.name] = new client.Gauge(inverterDayTmpl);
  // monthly generation
  gauges[inverterMonthTmpl.name] = new client.Gauge(inverterMonthTmpl);
  // yearly generation
  gauges[inverterYearTmpl.name] = new client.Gauge(inverterYearTmpl);
  // inverter temperature
  gauges[inverterTempTmpl.name] = new client.Gauge(inverterTempTmpl);
  // inverter grid current
  gauges[inverterCurrentTmpl.name] = new client.Gauge(inverterCurrentTmpl);
  // inverter grid voltage
  gauges[inverterVoltageTmpl.name] = new client.Gauge(inverterVoltageTmpl);
  // inverter grid frequency
  gauges[inverterFrequencyTmpl.name] = new client.Gauge(inverterFrequencyTmpl);
  // inverter wifi signal strength
  gauges[inverterWifiTmpl.name] = new client.Gauge(inverterWifiTmpl);

  // create gauges for solar panels
  // panel active power
  gauges[panelActiveTmpl.name] = new client.Gauge(panelActiveTmpl);
  // panel current
  gauges[panelCurrentTmpl.name] = new client.Gauge(panelCurrentTmpl);
  // panel voltage
  gauges[panelVoltageTmpl.name] = new client.Gauge(panelVoltageTmpl);

  return gauges;
}

function registerUpdater({ gauges, emitter }) {
  emitter.on(UPDATE_EVENT, updateTalentsGauges.bind(null, { gauges }));
}

function updateTalentsGauges({ gauges }, data) {
  // create gauges for all inverter functionality
  for (const station of data) {
    for (const inverter of station.inverters) {
      // active power
      gauges[inverterActiveTmpl.name]
        .labels({
          [INVERTER_LABEL]: inverter.serialNumber,
        })
        .set(inverter.power.active);

      // daily generation
      gauges[inverterDayTmpl.name]
        .labels({
          [INVERTER_LABEL]: inverter.serialNumber,
        })
        .set(inverter.power.today);

      // monthly generation
      gauges[inverterMonthTmpl.name]
        .labels({
          [INVERTER_LABEL]: inverter.serialNumber,
        })
        .set(inverter.power.month);

      // yearly generation
      gauges[inverterYearTmpl.name]
        .labels({
          [INVERTER_LABEL]: inverter.serialNumber,
        })
        .set(inverter.power.year);

      // inverter temperature
      gauges[inverterTempTmpl.name]
        .labels({
          [INVERTER_LABEL]: inverter.serialNumber,
        })
        .set(inverter.temperature);

      // inverter grid current
      gauges[inverterCurrentTmpl.name]
        .labels({
          [INVERTER_LABEL]: inverter.serialNumber,
        })
        .set(inverter.current);

      // inverter grid voltage
      gauges[inverterVoltageTmpl.name]
        .labels({
          [INVERTER_LABEL]: inverter.serialNumber,
        })
        .set(inverter.voltage);

      // inverter grid frequency
      gauges[inverterFrequencyTmpl.name]
        .labels({
          [INVERTER_LABEL]: inverter.serialNumber,
        })
        .set(inverter.frequency);
      // inverter grid frequency
      gauges[inverterWifiTmpl.name]
        .labels({
          [INVERTER_LABEL]: inverter.serialNumber,
        })
        .set(station.wifiSignalStrength);

      // create gauges for solar panels
      for (const panel of inverter.panels) {
        const panelId = inverter.serialNumber + "_" + panel.id;
        // panel active power
        gauges[panelActiveTmpl.name]
          .labels({
            [PANEL_LABEL]: panelId,
          })
          .set(panel.power);

        // panel current
        gauges[panelCurrentTmpl.name]
          .labels({
            [PANEL_LABEL]: panelId,
          })
          .set(panel.current);

        // panel voltage
        gauges[panelVoltageTmpl.name]
          .labels({
            [PANEL_LABEL]: panelId,
          })
          .set(panel.voltage);
      }
    }
  }
}

module.exports = {
  addPrometheusInterface,
};
