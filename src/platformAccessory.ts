/*
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
    const model = this.platform.config.model as string || 'device'
    const manufactor = 'FossiBot';
    if (!email || !password) {
      this.platform.log.error('email and password has to be provided in config');
      throw new Error('no email and/or password found in config');
    }
    this.fossilbotController = new FossibotController(device.host, device.mac, email, password);
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, manufactor)
        .setCharacteristic(this.platform.Characteristic.Model, model)
        .setCharacteristic(this.platform.Characteristic.SerialNumber, device.mac);
    this.service = this.accessory.getService(this.platform.Service.Outlet)
        || this.accessory.addService(this.platform.Service.Outlet);
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
*/

import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import type { FossibotHomebridgePlatform } from './platform.js';
import type { FossibotController as FossibotControllerType } from './controller/fossibotController';

const { FossibotController } = require('./controller/fossibotController');

export class FossibotPlatformAccessory {
  private service: Service;
  private fossilbotController: FossibotControllerType;
  private outputType: string;

  constructor(
      private readonly platform: FossibotHomebridgePlatform,
      private readonly accessory: PlatformAccessory,
  ) {
    const device = accessory.context.device;
    this.outputType = device.outputType;
    const email = this.platform.config.email as string;
    const password = this.platform.config.password as string;
    const model = this.platform.config.model as string || 'device';
    const manufactor = 'FossiBot';

    if (!email || !password) {
      this.platform.log.error('email and password has to be provided in config');
      throw new Error('no email and/or password found in config');
    }

    this.fossilbotController = new FossibotController(device.host, device.mac, email, password);

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, manufactor)
        .setCharacteristic(this.platform.Characteristic.Model, model)
        .setCharacteristic(this.platform.Characteristic.SerialNumber, device.mac);

    const ServiceType = this.outputType === 'led'
        ? this.platform.Service.Lightbulb
        : this.platform.Service.Outlet;

    this.service = this.accessory.getService(ServiceType)
        || this.accessory.addService(ServiceType);

    this.service.setCharacteristic(this.platform.Characteristic.Name, `Fossibot ${this.outputType.toUpperCase()}`);

    this.service.getCharacteristic(this.platform.Characteristic.On)
        .onSet(this.setOn.bind(this))
        .onGet(this.getOn.bind(this));
  }

  async setOn(value: CharacteristicValue) {
    this.platform.log.debug(`Fossibot setOn called for ${this.outputType} with:`, value);
    try {
      switch (this.outputType) {
        case 'ac':
          await (value ? this.fossilbotController.enableACOutput() : this.fossilbotController.disableACOutput());
          break;
        case 'dc':
          await (value ? this.fossilbotController.enableDCOutput() : this.fossilbotController.disableDCOutput());
          break;
        case 'usb':
          await (value ? this.fossilbotController.enableUSBOutput() : this.fossilbotController.disableUSBOutput());
          break;
        case 'led':
          await (value ? this.fossilbotController.enableLED() : this.fossilbotController.disableLED());
          break;
        default:
          throw new Error('Unknown output type');
      }
    } catch (error) {
      this.platform.log.error(`Error setting ${this.outputType} state:`, error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async getOn(): Promise<CharacteristicValue> {
    this.platform.log.debug(`Fossibot getOn called for ${this.outputType}`);
    try {
      switch (this.outputType) {
        case 'ac':
          return await this.fossilbotController.isACOutputEnabled();
        case 'dc':
          return await this.fossilbotController.isDCOutputEnabled();
        case 'usb':
          return await this.fossilbotController.isUSBOutputEnabled();
        case 'led':
          return await this.fossilbotController.isLEDEnabled();
        default:
          throw new Error('Unknown output type');
      }
    } catch (error) {
      this.platform.log.error(`Error getting ${this.outputType} state:`, error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }
}
