
// utils/mqttClient.js
import mqtt from 'mqtt';

class MqttClient {
  constructor() {
    if (!MqttClient.instance) {
      this.client = mqtt.connect('ws://test.mosquitto.org:8080');
      this.setupListeners();
      MqttClient.instance = this;
    }
    return MqttClient.instance;
  }


  setupListeners() {
    this.client.on('connect', () => {
      console.log('Connected to MQTT broker');
      this.client.subscribe('/led', (err) => {
        if (!err) {
          console.log('Subscribed to topic: /led');
        } else {
          console.error('Subscription error:', err);
        }
      });
    });

    this.client.on('message', (topic, message) => {
      console.log(`Message received on topic "${topic}": ${message.toString()}`);
    });

    this.client.on('error', (err) => {
      console.error('Connection error:', err);
    });
  }
}

const mqttClient = new MqttClient();
Object.freeze(mqttClient); // Prevent any changes to the instance

export default mqttClient;
