# TSUN / Talent Monitoring Connector

A Node.js project / Docker container that pulls data from the [www.talent-monitoring.com](https://www.talent-monitoring.com) cloud and converts it into a digestible JSON structure for consumption via HTTP/REST, a Prometheus endpoint for visualisation in Grafana and/or an MQTT Dispatcher for use with (mostly) your Home Assistant instance.

## Motivation

When my tiny solar power plant arrived I realized I order the "wrong" inverter in terms of connectivity, instead of a far superior [OpenDTU](https://github.com/tbnobody/OpenDTU) compatible unit, I ended up with a `TSUN TSOL-MS600 + WIFI / M800(DE) EVO`; which is not a bad performing inverter, just one with crappy connectivity. It sports a WiFi unit (with mediocre reception) and only uploads data in 5 minute intervals to some servers (at least in Frankfurt/Germany but who knows where this data is going to be replicated to...). The "App" that it comes with is pretty barebones and the website [www.talent-monitoring.com](https://www.talent-monitoring.com) is only a tad better. Also, the servers seem to crap out from time to time, which then also affects this software as well.

If you want to measure the power you produce accurately & in realtime, better get an outdoor or socket mounted smart switch with measuring capabilities.
Still this will then only give you the amount of power you produce, other data like the actual power each panel produces or the temperature of the inverter can't really be measured by external solutions.

So, this piece of software aims to ease the pain a bit, enabling you to ditch the App & Website for now while fetching the data from the cloud & making it available locally via HTTP & MQTT (with Home Assistant autodiscovery).

Btw.: The code is spaghetti, I don't really have the intention to clean it up, it's more of an "I already spent enough time with it, works okay enough now" situation. Still, if you want to improve it, please feel free & send a PR :D
But most importantly, this is just a "stopgap implementation" to me, as I'm currently working on a local proxy implementation that is able to capture the data before it will be send to the remote servers.

## Data access & integrations

### Home Assistant (MQTT)

Home Assistant can be fed with data using MQTT, it's automatic discovery is supported,
so as soon as you've enabled MQTT (set the environment variable `MQTT_ENABLED` to `true`) and configured your broker, new devices should be available in your
Home Assistant instance. You'll get one device for each inverter you sport, as well as an additional device for each of your solar panels.

In order to add the data to your energy dashboard, you have to generate a Riemann helper entity, based on the current power in Watts.
The configuration of the helper entity is "Left Riemann sum" & a metric prefix of "kilo" with an "hourly" unit.

Note: After the first start of the container, the entities should be generated directly, but it can take up to 5 minutes for the first values to be displayed.

### Prometheus / Grafana

If you set the environment variable `PROMETHEUS_ENABLED` to `true`, you get the data in a Prometheus / Grafana compatible format.
It is available via the `/metrics` endpoint by default, which can be changed using the `PROMETHEUS_ENDPOINT` variable.
You can also enable service metrics like CPU, RAM consumption of the software itself by setting the `PROMETHEUS_INCLUDE_SERVICE` to `true`,
which is disabled by default.

The output of the endpoint should be similar to this:

```
# HELP inverter_active_power active power measured in Watt
# TYPE inverter_active_power gauge
inverter_active_power{serialno="$YourInverterSerial"} 5

# HELP inverter_daily_generation energy generated today measured in Wh
# TYPE inverter_daily_generation gauge
inverter_daily_generation{serialno="$YourInverterSerial"} 1430

# HELP inverter_monthly_generation energy generated this month measured in kWh
# TYPE inverter_monthly_generation gauge
inverter_monthly_generation{serialno="$YourInverterSerial"} 18.92

# HELP inverter_yearly_generation energy generated this year measured in kWh
# TYPE inverter_yearly_generation gauge
inverter_yearly_generation{serialno="$YourInverterSerial"} 217.92

# HELP inverter_temperature inverter temperature measured in degrees celsius
# TYPE inverter_temperature gauge
inverter_temperature{serialno="$YourInverterSerial"} 24

# HELP inverter_current grid current measured in Ampere
# TYPE inverter_current gauge
inverter_current{serialno="$YourInverterSerial"} 0.02

# HELP inverter_voltage grid voltage measured in Volt
# TYPE inverter_voltage gauge
inverter_voltage{serialno="$YourInverterSerial"} 233.7

# HELP inverter_frequency grid frequency measured in Hz
# TYPE inverter_frequency gauge
inverter_frequency{serialno="$YourInverterSerial"} 50

# HELP inverter_wifi_signal_strength inverter WiFi signal strength measured in %
# TYPE inverter_wifi_signal_strength gauge
inverter_wifi_signal_strength{serialno="$YourInverterSerial"} 40

# HELP panel_active_power solar panel active power measured in Watt
# TYPE panel_active_power gauge
panel_active_power{panelid="$YourInverterSerial_PV1"} 2.9
panel_active_power{panelid="$YourInverterSerial_PV2"} 2.4

# HELP panel_current solar panel current measured in Ampere
# TYPE panel_current gauge
panel_current{panelid="$YourInverterSerial_PV1"} 0.09
panel_current{panelid="$YourInverterSerial_PV2"} 0.07

# HELP panel_voltage solar panel voltage measured in Volt
# TYPE panel_voltage gauge
panel_voltage{panelid="$YourInverterSerial_PV1"} 29.6
panel_voltage{panelid="$YourInverterSerial_PV2"} 29.8
```

### REST

If you set the environment variable `REST_ENABLED` to `true`, you get the data in a JSON format.
It is available via the `/power-station` endpoint by default, which can be changed using the `REST_ENDPOINT` variable.

The data should be in this format, given you have 1 power station, 1 inverter & 2 solar panels. If you run more / less appliances, the output will of course vary depending on your installation.

```json
[
  {
    "guid": "$YOUR_POWERSTATION_GUID",
    "online": true,
    "power": {
      "active": 5, // W
      "today": 1430, // Wh
      "month": 18.92, // kWh
      "year": 217.92 // kWh
    },
    "name": "$YOUR_POWERSTATION_NAME",
    "timestamp": "2023-08-17T18:28:03.000Z", // ISO 8601 date of the last successful communication with your power-station
    "numberOfPanels": 2,
    "numberOfInverters": 1,
    "wifiSignalStrength": 40, // %
    "inverters": [
      {
        "guid": "$YOUR_INVERTER_GUID",
        "online": true,
        "numberOfPanels": 2,
        "firmwareVersion": "$YOUR_INVERTER_FIRMWARE_VERSION",
        "ratedPower": 600, // W
        "serialNumber": "$YOUR_INVERTER_SERIAL",
        "model": "$YOUR_INVERTER_MODEL",
        "brand": "$YOUR_INVERTER_BRAND",
        "power": {
          "active": 5, // W
          "today": 1430, // Wh
          "month": 18.92, // kWh
          "year": 217.92 // kWh
        },
        "current": 0.02, // A
        "voltage": 233.7, // V
        "frequency": 50, // Hz
        "temperature": 24, // °C
        "panels": [
          {
            "id": "PV1",
            "current": 0.09, // A
            "power": 2.9, // W
            "voltage": 29.6 // V
          },
          {
            "id": "PV2",
            "current": 0.07, // A
            "power": 2.4, // W
            "voltage": 29.8 // V
          }
        ]
      }
    ]
  }
]
```

## Deployment

### Docker Compose

```yml
version: "3.9"
services:
	solarmonitor:
		container_name: "talent-monitoring"
		image: "asciidisco/talent-monitoring:2023.8"
		ports:
			- "3000:3000/tcp"
		restart: "unless-stopped"
		environment:
			TZ: "Europe/Berlin"
			API_USERNAME: "$YOUR_TALENT_MONITORING_COM_USERNAME"
			API_PASSWORD: "$YOUR_TALENT_MONITORING_COM_PASSWORD"
			REST_ENABLED: true
			PROMETHEUS_ENABLED: true
			MQTT_ENABLED: true
			MQTT_HOST: "$YOUR_MQTT_BROKER_HOST"
			MQTT_USERNAME: "$YOUR_MQTT_BROKER_USERNAME"
			MQTT_PASSWORD: "$YOUR_MQTT_BROKER_PASSWORD"
			DEVICE_PANEL_MANUFACTURER: "$YOUR_SOLAR_PANEL_MANUFACTURER"
			DEVICE_PANEL_MODEL: "$YOUR_SOLAR_PANEL_MODEL"
		healthcheck:
			test: curl --fail http://localhost:3000/health || exit 1
			interval: 60s
			retries: 5
			start_period: 20s
			timeout: 10s
```

### Node.js

If you don't want to run this software in a docker container, you can always install [Node.js](https://nodejs.org) on your system, `git clone` this repository `npm install` all the dependencies & `npm start` in order to run it on your host system, LXC container or VM.
Just make sure all necessary environment variables are set.

### Environment variables

| Variable                            | Required | Description                                                            | Default        |
| ----------------------------------- | -------- | ---------------------------------------------------------------------- | -------------- |
| TZ                                  | no       | Your local timezone                                                    | Europe/Berlin  |
| SERVER_PORT                         | no       | Webserver port (If you change it make sure to adapt your docker vars)  | 3000           |
| LOG_LEVEL                           | no       | One of 'fatal', 'error', 'warn', 'info', 'debug', 'trace' or 'silent'. | info           |
| API_USERNAME                        | yes      | Your talent-monitoring.com username                                    | -              |
| API_PASSWORD                        | yes      | Your talent-monitoring.com password                                    | -              |
| REST_ENABLED                        | no       | Enable / Disable the JSON REST endpoint                                | false          |
| REST_ENDPOINT                       | no       | Changes the default data route                                         | /power-station |
| PROMETHEUS_ENABLED                  | no       | Enable / Disable the Prometheus endpoint                               | false          |
| PROMETHEUS_ENDPOINT                 | no       | Changes the default prometheus route                                   | /metrics       |
| PROMETHEUS_INCLUDE_SERVICE          | no       | Enable / Disable the service metrics                                   | false          |
| PROMETHEUS_INCLUDE_API              | no       | Enable / Disable the solar data metrics                                | false          |
| MQTT_HOST                           | no       | Your MQTT host                                                         | -              |
| MQTT_USERNAME                       | no       | Your MQTT username (if auth enabled)                                   | -              |
| MQTT_PASSWORD                       | no       | Your MQTT password (if auth enabled)                                   | -              |
| MQTT_ENABLED                        | no       | Enable / Disable the MQTT service                                      | false          |
| MQTT_CLIENTID                       | no       | Changes the MQTT client id                                             | talents2mqtt   |
| MQTT_BASE_TOPIC                     | no       | Changes the MQTT base topic                                            | talents2mqtt   |
| MQTT_HOMEASSISTANT_DISCOVERY_PREFIX | no       | Changes the Home Assistant MQTT Discovery Topic                        | homeassistant  |
| DEVICE_PANEL_MANUFACTURER           | no       | Add the manufacturer of your Solar Panels for display in HA            | unknown        |
| DEVICE_PANEL_MODEL                  | no       | Add the model of your Solar Panels for display in HA                   | unknown        |

## Issues & Questions

If you have any questions and or issue, or want to improve this, don't hesitate to reach out via GitHub Issues and/or create a Pull Request.

## License

MIT License

Copyright (c) 2023 Sebastian Golasch

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
