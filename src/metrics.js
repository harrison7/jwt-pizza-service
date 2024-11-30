const os = require('os');
const config = require('./config.js');

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

class Metrics {
  constructor() {
    this.httpRequests = 0;
    this.getRequests = 0;
    this.putRequests = 0;
    this.postRequests = 0;
    this.deleteRequests = 0;
    this.authSuccess = 0;
    this.authFail = 0;
    this.activeUsers = 0;
    this.pizzasSold = 0;
    this.pizzaFails = 0;
    this.cashEarned = 0;
    this.requestLatency = 0;
    this.pizzaLatency = 0;
    

    // This will periodically sent metrics to Grafana
    const timer = setInterval(() => {
      this.sendMetricToGrafana('request', 'all', 'total', this.httpRequests);
      this.sendMetricToGrafana('request', 'get', 'get', this.getRequests);
      this.sendMetricToGrafana('request', 'put', 'put', this.putRequests);
      this.sendMetricToGrafana('request', 'post', 'post', this.postRequests);
      this.sendMetricToGrafana('request', 'delete', 'delete', this.deleteRequests);

      this.sendMetricToGrafana('userbase', 'users', 'count', this.activeUsers);

      this.sendMetricToGrafana('auth', 'login', 'success', this.authSuccess);
      this.sendMetricToGrafana('auth', 'login', 'fail', this.authFail);

      this.sendMetricToGrafana('pizza', 'sold', 'quantity', this.pizzasSold);
      this.sendMetricToGrafana('pizza', 'fail', 'quantity', this.pizzaFails);
      this.sendMetricToGrafana('pizza', 'sold', 'cash', this.cashEarned);

      this.sendMetricToGrafana('system', 'latency', 'request', this.requestLatency);
      this.sendMetricToGrafana('system', 'latency', 'pizza', this.pizzaLatency);

      this.sendMetricToGrafana('system', 'cpu', 'usage', getCpuUsagePercentage());
      this.sendMetricToGrafana('system', 'memory', 'usage', getMemoryUsagePercentage());
    }, 10000);
    timer.unref();
  }

  incrementRequests(request) {
    this.httpRequests++;
    if (request === 'get') {
      this.getRequests++;
    }
    if (request === 'put') {
      this.putRequests++;
    }
    if (request === 'post') {
      this.postRequests++;
    }
    if (request === 'delete') {
      this.deleteRequests++;
    }
    if (request === 'success') {
      this.authSuccess++;
    }
    if (request === 'fail') {
      this.authFail++;
    }
  }

  userLogin() {
    this.activeUsers++;
  }

  userLogout() {
    this.activeUsers--;
  }

  pizzaSold(cost) {
    this.pizzasSold++;
    this.cashEarned += cost;
  }

  pizzaFail() {
    this.pizzaFails++;
  }

  timeService(startTime, endTime) {
    this.serviceLatency += endTime - startTime;
  }

  timePizza(startTime, endTime) {
    this.pizzaLatency += endTime - startTime;
  }

  sendMetricToGrafana(metricPrefix, httpMethod, metricName, metricValue) {
    const metric = `${metricPrefix},source=${config.metrics.source},method=${httpMethod} ${metricName}=${metricValue}`;

    fetch(`${config.metrics.url}`, {
      method: 'post',
      body: metric,
      headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
    })
      .then((response) => {
        if (!response.ok) {
          console.error('Failed to push metrics data to Grafana');
        } else {
          console.log(`Pushed ${metric}`);
        }
      })
      .catch((error) => {
        console.error('Error pushing metrics:', error);
      });
  }

    // sendMetricsPeriodically(period) {
    //     const timer = setInterval(() => {
    //     try {
    //         const buf = new MetricBuilder();
    //         httpMetrics(buf);
    //         systemMetrics(buf);
    //         userMetrics(buf);
    //         purchaseMetrics(buf);
    //         authMetrics(buf);
    
    //         const metrics = buf.toString('\n');
    //         this.sendMetricToGrafana(metrics);
    //     } catch (error) {
    //         console.log('Error sending metrics', error);
    //     }
    //     }, period);
    // }
}

const metrics = new Metrics();
module.exports = metrics;
