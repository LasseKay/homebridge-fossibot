import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import type { Platform } from './platform.js';
import type { Controller as ControllerType } from './controller';

const { Controller } = require('./controller');

export class Accessory {
  private service: Service;
  private controller: ControllerType;
  private outputType: string;

  constructor(
      private readonly platform: Platform,
      private readonly accessory: PlatformAccessory,
  ) {
    const device = accessory.context.device;
    this.outputType = device.outputType;
    const email = this.platform.config.email as string;
    const password = this.platform.config.password as string;
    const model = this.platform.config.model as string || 'device';
    const manufacturer = 'FossiBot';

    if (!email || !password) {
      this.platform.log.error('email and password has to be provided in config');
      throw new Error('no email and/or password found in config');
    }

    this.controller = new Controller(device.host, device.mac, this.platform.connector);

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, manufacturer)
        .setCharacteristic(this.platform.Characteristic.Model, model)
        .setCharacteristic(this.platform.Characteristic.SerialNumber, device.mac);

    const ServiceType = this.outputType === 'led'
        ? this.platform.Service.Lightbulb
        : this.platform.Service.Outlet;

    this.service = this.accessory.getService(ServiceType)
        || this.accessory.addService(ServiceType);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.outputType.toUpperCase());

    this.service.getCharacteristic(this.platform.Characteristic.On)
        .onSet(this.setOn.bind(this))
        .onGet(this.getOn.bind(this));
  }

  async setOn(value: CharacteristicValue) {
    this.platform.log.debug(`setOn called for ${this.outputType} with:`, value);
    try {
      switch (this.outputType) {
        case 'ac':
          await (value ? this.controller.enableACOutput() : this.controller.disableACOutput());
          break;
        case 'dc':
          await (value ? this.controller.enableDCOutput() : this.controller.disableDCOutput());
          break;
        case 'usb':
          await (value ? this.controller.enableUSBOutput() : this.controller.disableUSBOutput());
          break;
        case 'led':
          await (value ? this.controller.enableLED() : this.controller.disableLED());
          break;
        default:
          throw new Error('unknown output type');
      }
    } catch (error) {
      this.platform.log.error(`error setting ${this.outputType} state:`, error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async getOn(): Promise<CharacteristicValue> {
    this.platform.log.debug(`getOn called for ${this.outputType}`);
    try {
      switch (this.outputType) {
        case 'ac':
          return (await this.controller.isACOutputEnabled()) ?? false;
        case 'dc':
          return (await this.controller.isDCOutputEnabled()) ?? false;
        case 'usb':
          return (await this.controller.isUSBOutputEnabled()) ?? false;
        case 'led':
          return (await this.controller.isLEDEnabled()) ?? false;
        default:
          this.platform.log.warn(`unknown output type: ${this.outputType}`);
          return false;
      }
    } catch (error) {
      this.platform.log.error(`error getting ${this.outputType} state: `, error);
      return false;
    }
  }
}
