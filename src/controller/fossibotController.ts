const Connector = require('../lib/connector').Connector;

export class FossibotController {
    private connector: typeof Connector.prototype;
    private deviceId: string;
    private initialized = false;

    constructor(_host: string, macAddress: string, email: string, password: string) {
        this.connector = new Connector(email, password);
        this.deviceId = macAddress.replace(/:/g, '').toUpperCase();
    }

    private async init(): Promise<void> {
        if (!this.initialized) {
            await this.connector.connect();
            this.initialized = true;
        }
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
}
