import type {
    API,
    Characteristic,
    DynamicPlatformPlugin,
    Logging,
    PlatformAccessory,
    PlatformConfig,
    Service
} from 'homebridge';
import type {Connector as ConnectorType} from "./connector";

const rxjs = require('rxjs');
const BehaviorSubject: typeof import('rxjs').BehaviorSubject = rxjs.BehaviorSubject;
const Connector = require('./connector').Connector;
const {retry} = require('./utils/retry')
const {Accessory} = require('./accessory.js');
const {PLATFORM_NAME, PLUGIN_NAME} = require('./settings.js');
const {Api} = require('./lib/api');

export class Platform implements DynamicPlatformPlugin {
    public readonly Service: typeof Service;
    public readonly Characteristic: typeof Characteristic;
    public readonly accessories: Map<string, PlatformAccessory> = new Map();
    private devices$ = new BehaviorSubject<Record<string, DeviceState>>({});
    public readonly discoveredCacheUUIDs: string[] = [];
    public readonly connector: ConnectorType;
    private readonly serverPort: number;
    private readonly email: string;
    private readonly password: string;
    private readonly apiServer;

    private outputs = [
        {name: 'USB Output', type: 'usb'},
        {name: 'AC Output', type: 'ac'},
        {name: 'DC Output', type: 'dc'},
        {name: 'LED Light', type: 'led'},
    ];

    constructor(
        public readonly log: Logging,
        public readonly config: PlatformConfig,
        public readonly api: API,
    ) {
        this.email = config.email;
        this.password = config.password;
        this.Service = api.hap.Service;
        this.Characteristic = api.hap.Characteristic;
        this.log.debug('finished initializing platform: ', this.config.name);
        this.serverPort = this.config.serverPort ?? 3000;
        this.connector = new Connector(config.email, config.password, this.devices$)
        this.apiServer = new Api(this.connector, this.devices$);
        this.apiServer.start(this.serverPort);
        this.log.info(`api server started on port ${this.serverPort}`);

        this.api.on('shutdown', () => {
            this.apiServer.stop();
            this.log.info('api server stopped.');
        });

        this.api.on('didFinishLaunching', async () => {
            this.log.debug('Executed didFinishLaunching callback');
            await this.discoverDevices();
        });
    }

    configureAccessory(accessory: PlatformAccessory) {
        this.log.info('loading accessory from cache: ', accessory.displayName);
        this.accessories.set(accessory.UUID, accessory);
    }

    async discoverDevices() {
        await retry(() => this.connector.connect())
        console.log('successfully connected with api server')
        const mac = this.config.mac as string;
        if (!mac) {
            this.log.error('device mac address missing in config!');
            return;
        }
        this.outputs.forEach(output => {
            const uuid = this.api.hap.uuid.generate(`${mac}-${output.type}`);
            const existingAccessory = this.accessories.get(uuid);
            if (existingAccessory) {
                this.log.info('restoring existing accessory from cache: ', existingAccessory.displayName);
                existingAccessory.context.device = {
                    mac,
                    host: this.config.host,
                    outputType: output.type,
                };
                new Accessory(this, existingAccessory);
            } else {
                this.log.info('adding new accessory');
                const accessory = new this.api.platformAccessory(output.name, uuid);
                accessory.context.device = {
                    mac,
                    host: this.config.host,
                    outputType: output.type,
                };
                new Accessory(this, accessory);
                this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
            }
            this.discoveredCacheUUIDs.push(uuid);
        });
        for (const [uuid, accessory] of this.accessories) {
            if (!this.discoveredCacheUUIDs.includes(uuid)) {
                this.log.info('removing accessory from cache: ', accessory.displayName);
                this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
            }
        }
    }
}
