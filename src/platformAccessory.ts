import type {CharacteristicValue, PlatformAccessory, Service} from 'homebridge';
import type {FossibotHomebridgePlatform} from './platform.js';
import type {FossibotController as FossibotControllerType} from './controller/fossibotController';

const { FossibotController } = require('./controller/fossibotController');

export class FossibotPlatformAccessory {
  private service: Service;
  private fossilbotController: FossibotControllerType;

  constructor(
      private readonly platform: FossibotHomebridgePlatform,
      private readonly accessory: PlatformAccessory,
  ) {
    const device = accessory.context.device;
    const email = this.platform.config.email as string;
    const password = this.platform.config.password as string;
    if (!email || !password) {
      this.platform.log.error('Email und Passwort müssen in der Plugin-Konfiguration angegeben werden!');
      throw new Error('Email und Passwort fehlen in config');
    }
    this.fossilbotController = new FossibotController(device.host, device.mac, email, password);
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Fossibot')
        .setCharacteristic(this.platform.Characteristic.Model, 'Powerstation')
        .setCharacteristic(this.platform.Characteristic.SerialNumber, device.mac);
    this.service = this.accessory.getService(this.platform.Service.Lightbulb)
        || this.accessory.addService(this.platform.Service.Lightbulb);
    this.service.setCharacteristic(this.platform.Characteristic.Name, 'Fossibot Powerstation');
    this.service.getCharacteristic(this.platform.Characteristic.On)
        .onSet(this.setOn.bind(this))
        .onGet(this.getOn.bind(this));
  }

  async setOn(value: CharacteristicValue) {
    this.platform.log.debug('Fossibot setOn called with:', value);
    try {
      if (value) {
        await this.fossilbotController.enableACOutput();
      } else {
        await this.fossilbotController.disableACOutput();
      }
    } catch (error) {
      this.platform.log.error('Error setting AC Output:', error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async getOn(): Promise<CharacteristicValue> {
    this.platform.log.debug('Fossibot getOn called');
    try {
      return await this.fossilbotController.isACOutputEnabled();
    } catch (error) {
      this.platform.log.error('Error getting AC Output state:', error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }
}
