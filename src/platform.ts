import type { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';
const { FossibotPlatformAccessory } = require('./platformAccessory.js');
const { PLATFORM_NAME, PLUGIN_NAME } = require('./settings.js');
const { FossibotApiServer } = require('./apiServer');

export class FossibotHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  public readonly accessories: Map<string, PlatformAccessory> = new Map();
  public readonly discoveredCacheUUIDs: string[] = [];
  private readonly serverPort: number;
  private readonly email: string;
  private readonly password: string;
  private readonly apiServer;


  constructor(
      public readonly log: Logging,
      public readonly config: PlatformConfig,
      public readonly api: API,
  ) {
    this.email = config.email;
    this.password = config.password;
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;
    this.log.debug('Finished initializing platform:', this.config.name);
    this.serverPort = this.config.serverPort ?? 3000;
    this.apiServer = new FossibotApiServer(this.email, this.password);
    this.apiServer.start(this.serverPort);
    this.log.info(`Fossibot API-Server gestartet auf Port ${this.serverPort}`);
    this.api.on('shutdown', () => {
      this.apiServer.stop();
      this.log.info('Fossibot API-Server wurde gestoppt.');
    });

    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.set(accessory.UUID, accessory);
  }

  discoverDevices() {
    const mac = this.config.mac as string;
    if (!mac) {
      this.log.error('Fossibot host or mac address missing in config!');
      return;
    }
    const uuid = this.api.hap.uuid.generate(mac);
    const existingAccessory = this.accessories.get(uuid);
    if (existingAccessory) {
      this.log.info('Restoring existing Fossibot accessory from cache:', existingAccessory.displayName);
      new FossibotPlatformAccessory(this, existingAccessory);
    } else {
      this.log.info('Adding new Fossibot accessory');
      const accessory = new this.api.platformAccessory('Fossibot Powerstation', uuid);
      accessory.context.device = { mac };
      new FossibotPlatformAccessory(this, accessory);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
    this.discoveredCacheUUIDs.push(uuid);
    for (const [uuid, accessory] of this.accessories) {
      if (!this.discoveredCacheUUIDs.includes(uuid)) {
        this.log.info('Removing accessory from cache:', accessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}
