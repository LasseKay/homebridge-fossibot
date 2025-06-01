const Connector = require('./lib/connector').Connector;
const { retry } = require('./utils/retry')

export class Controller {
    private connector: typeof Connector.prototype;
    private deviceId: string;
    private initialized = false;

    constructor(_host: string, macAddress: string, email: string, password: string) {
        this.connector = new Connector(email, password);
        this.deviceId = macAddress.replace(/:/g, '');
    }

    async enableUSBOutput(): Promise<void> {
        await this.init();
        const result = await this.connector.runCommand(this.deviceId, 'REGEnableUSBOutput');
        if (result.error) throw new Error(result.error);
    }

    async disableUSBOutput() {
        await this.init();
        const result = await this.connector.runCommand(this.deviceId, 'REGDisableUSBOutput');
        if (result.error) throw new Error(result.error);
    }

    async isUSBOutputEnabled(): Promise<boolean> {
        await this.init();
        const device = this.connector.getDeviceById(this.deviceId);
        if (device.error) throw new Error(device.error);
        return !!device.usbOutput
    }

    async enableACOutput(): Promise<void> {
        await this.init();
        const result = await this.connector.runCommand(this.deviceId, 'REGEnableACOutput');
        if (result.error) throw new Error(result.error);
    }

    async disableACOutput(): Promise<void> {
        await this.init();
        const result = await this.connector.runCommand(this.deviceId, 'REGDisableACOutput');
        if (result.error) throw new Error(result.error);
    }

    async isACOutputEnabled(): Promise<boolean> {
        await this.init();
        const device = this.connector.getDeviceById(this.deviceId);
        if (device.error) throw new Error(device.error);
        return !!device.acOutput;
    }

     async enableDCOutput(): Promise<void> {
         await this.init();
         const result = await this.connector.runCommand(this.deviceId, 'REGEnableDCOutput');
         if (result.error) throw new Error(result.error);
    }

     async disableDCOutput(): Promise<void> {
         await this.init();
         const result = await this.connector.runCommand(this.deviceId, 'REGDisableDCOutput');
         if (result.error) throw new Error(result.error);
    }

    async isDCOutputEnabled(): Promise<boolean> {
        await this.init();
        const device = this.connector.getDeviceById(this.deviceId);
        if (device.error) throw new Error(device.error);
        return !!device.dcOutput;
    }

     async enableLED(): Promise<void> {
         await this.init();
         const result = await this.connector.runCommand(this.deviceId, 'REGEnableLEDAlways');
         if (result.error) throw new Error(result.error);
    }

     async disableLED(): Promise<void> {
         await this.init();
         const result = await this.connector.runCommand(this.deviceId, 'REGDisableLED');
         if (result.error) throw new Error(result.error);
    }

    async isLEDEnabled(): Promise<boolean> {
        await this.init();
        const device = this.connector.getDeviceById(this.deviceId);
        if (device.error) throw new Error(device.error);
        return !!device.ledOutput;
    }

    private async init(): Promise<void> {
        if (!this.initialized) {
            await retry(() => this.connector.connect());
            this.initialized = true;
        }
    }

}
