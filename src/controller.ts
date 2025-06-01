import type {Connector} from './lib/connector';

export class Controller {
    private connector: Connector;
    private deviceId: string;
    private initialized = false;

    constructor(_host: string, macAddress: string, connector: Connector) {
        this.connector = connector;
        this.deviceId = macAddress.replace(/:/g, '');
    }

    async enableUSBOutput(): Promise<void> {
        const result = await this.connector.runCommand(this.deviceId, 'REGEnableUSBOutput');
        if (result.error) throw new Error(result.error);
    }

    async disableUSBOutput() {
        const result = await this.connector.runCommand(this.deviceId, 'REGDisableUSBOutput');
        if (result.error) throw new Error(result.error);
    }

    async isUSBOutputEnabled(): Promise<boolean> {
        const device = this.connector.getDeviceById(this.deviceId);
        if (device.error) throw new Error(device.error);
        return !!device.usbOutput
    }

    async enableACOutput(): Promise<void> {
        const result = await this.connector.runCommand(this.deviceId, 'REGEnableACOutput');
        if (result.error) throw new Error(result.error);
    }

    async disableACOutput(): Promise<void> {
        const result = await this.connector.runCommand(this.deviceId, 'REGDisableACOutput');
        if (result.error) throw new Error(result.error);
    }

    async isACOutputEnabled(): Promise<boolean> {
        const device = this.connector.getDeviceById(this.deviceId);
        if (device.error) throw new Error(device.error);
        return !!device.acOutput;
    }

     async enableDCOutput(): Promise<void> {
         const result = await this.connector.runCommand(this.deviceId, 'REGEnableDCOutput');
         if (result.error) throw new Error(result.error);
    }

     async disableDCOutput(): Promise<void> {
         const result = await this.connector.runCommand(this.deviceId, 'REGDisableDCOutput');
         if (result.error) throw new Error(result.error);
    }

    async isDCOutputEnabled(): Promise<boolean> {
        const device = this.connector.getDeviceById(this.deviceId);
        if (device.error) throw new Error(device.error);
        return !!device.dcOutput;
    }

     async enableLED(): Promise<void> {
         const result = await this.connector.runCommand(this.deviceId, 'REGEnableLEDAlways');
         if (result.error) throw new Error(result.error);
    }

     async disableLED(): Promise<void> {
         const result = await this.connector.runCommand(this.deviceId, 'REGDisableLED');
         if (result.error) throw new Error(result.error);
    }

    async isLEDEnabled(): Promise<boolean> {
        const device = this.connector.getDeviceById(this.deviceId);
        if (device.error) throw new Error(device.error);
        return !!device.ledOutput;
    }

}
