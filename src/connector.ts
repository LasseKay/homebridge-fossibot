import type {MqttClient} from 'mqtt';
import type {BehaviorSubject} from 'rxjs';

const REGISTERS = require('./lib/registers');
const {sign, highLowToInt} = require('./lib/functions');
const {retry} = require('./utils/retry');

const DEBUG = true;

const axios = require('axios');
const crypto = require('crypto');
const mqtt = require('mqtt');
const endpoint = 'https://api.next.bspapp.com/client';
const clientSecret = '5rCEdl/nx7IgViBe4QYRiQ==';
const deviceId = crypto.randomBytes(16).toString('hex').toUpperCase();
const deviceBrand = 'Samsung';
const deviceModel = 'SM-A426B';
const appVersion = 123;
const appVersionCode = '1.2.3';
const deviceOsVersion = 10;
const deviceUserAgent = 'Mozilla/5.0 (Linux; Android 10; SM-A426B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.86 Mobile Safari/537.36';
const deviceBrowserVersion = '130.0.6723.86';
const API_AUTH = 'api-auth';
const API_LOGIN = 'api-login';
const API_DOLOGIN = 'api-dolog';
const API_MQTT = 'api-mqtt';
const API_DEVICES = 'api-devs';
const mqttHost = 'ws://mqtt.sydpower.com:8083/mqtt';
let _username = '';
let _password = '';

export class Connector {
    private username = '';
    private password = '';
    private mqttClient: MqttClient | null = null;
    public devices$: BehaviorSubject<Record<string, DeviceState>>;

    constructor(username: string, password: string, devices$: BehaviorSubject<Record<string, DeviceState>>) {
        this.username = username;
        _username = username;
        this.password = password;
        _password = password;
        this.devices$ = devices$;
    }

    private async api(config: any): Promise<any> {
        const clientInfo = JSON.stringify({
            PLATFORM: 'app',
            OS: 'android',
            APPID: '__UNI__55F5E7F',
            DEVICEID: deviceId,
            channel: 'google',
            scene: 1001,
            appId: '__UNI__55F5E7F',
            appLanguage: 'en',
            appName: 'BrightEMS',
            appVersion: appVersionCode,
            appVersionCode: appVersion,
            appWgtVersion: appVersionCode,
            browserName: 'chrome',
            browserVersion: deviceBrowserVersion,
            deviceBrand,
            deviceId,
            deviceModel,
            deviceType: 'phone',
            osName: 'android',
            osVersion: deviceOsVersion,
            romName: 'Android',
            romVersion: deviceOsVersion,
            ua: deviceUserAgent,
            uniPlatform: 'app',
            uniRuntimeVersion: '4.24',
            locale: 'en',
            LOCALE: 'en',
        });
        let method = 'serverless.function.runtime.invoke';
        let params = '{}';
        switch (config.route) {
            case API_AUTH:
                method = 'serverless.auth.user.anonymousAuthorize';
                break;
            case API_LOGIN:
                params = JSON.stringify({
                    functionTarget: 'router',
                    functionArgs: {
                        $url: 'user/pub/login',
                        data: {locale: 'en', username: config.username, password: config.password},
                        clientInfo: JSON.parse(clientInfo),
                    },
                });
                break;
            case API_DOLOGIN:
                params = JSON.stringify({
                    functionTarget: 'router',
                    functionArgs: {
                        $url: 'user/pub/loginByToken',
                        data: {locale: 'en'},
                        clientInfo: JSON.parse(clientInfo),
                        uniIdToken: config.accessToken,
                    },
                });
                break;
            case API_MQTT:
                params = JSON.stringify({
                    functionTarget: 'router',
                    functionArgs: {
                        $url: 'common/emqx.getAccessToken',
                        data: {locale: 'en'},
                        clientInfo: JSON.parse(clientInfo),
                        uniIdToken: config.accessToken,
                    },
                });
                break;
            case API_DEVICES:
                params = JSON.stringify({
                    functionTarget: 'router',
                    functionArgs: {
                        $url: 'client/device/kh/getList',
                        data: {locale: 'en', pageIndex: 1, pageSize: 100},
                        clientInfo: JSON.parse(clientInfo),
                        uniIdToken: config.accessToken,
                    },
                });
                break;
        }
        const data: any = {
            method,
            params,
            spaceId: 'mp-6c382a98-49b8-40ba-b761-645d83e8ee74',
            timestamp: Date.now(),
        };
        if (config.authorizeToken) data.token = config.authorizeToken;
        const response = await retry(() => axios.post(endpoint, data, {
            headers: {
                'Content-Type': 'application/json',
                'x-serverless-sign': sign(data, clientSecret),
                'user-agent': deviceUserAgent,
            },
        }));
        return response.data;
    }

    public async connect(): Promise<void> {
        const log = (...args: any[]) => DEBUG && console.debug('[CONNECT]', ...args);
        const auth = await this.api({route: API_AUTH});
        if (!auth?.data?.accessToken) {
            console.error(`AUTH failed: ${auth?.error || 'No response'}`);
            throw new Error(`AUTH failed: ${auth?.error || 'No response'}`)
        }
        const authorizeToken = auth.data?.accessToken;
        if (!authorizeToken) {
            console.error('No access token from AUTH');
            throw new Error('No access token from AUTH');
        }
        log('Step 1: AUTH success');
        const login = await this.api({
            route: API_LOGIN,
            authorizeToken,
            username: this.username,
            password: this.password,
        });
        if (!login?.data?.token) {
            console.error(`LOGIN failed: ${login.data?.errMsg || login.data?.msg || 'No response'}`);
            throw new Error(`LOGIN failed: ${login.data?.errMsg || login.data?.msg || 'No response'}`);
        }
        const accessToken = login.data?.token;
        if (!accessToken) {
            console.error('No token from LOGIN');
            throw new Error('No token from LOGIN');
        }
        log('Step 2: LOGIN success');
        const mqttAccess = await this.api({
            route: API_MQTT,
            authorizeToken,
            accessToken,
        });
        if (!mqttAccess || mqttAccess.error) {
            console.error(`MQTT auth failed: ${mqttAccess?.error || 'No response'}`);
            throw new Error(`MQTT auth failed: ${mqttAccess?.error || 'No response'}`);
        }
        const mqttToken = mqttAccess.data?.access_token;
        if (!mqttToken) {
            console.error('No access_token from MQTT API');
            throw new Error('No access_token from MQTT API');
        }
        log('Step 3: MQTT token received');
        const devicesResp = await this.api({
            route: API_DEVICES,
            authorizeToken,
            accessToken,
        });
        if (!devicesResp || devicesResp.error) {
            console.error(`DEVICE fetch failed: ${devicesResp?.error || 'No response'}`);
            throw new Error(`DEVICE fetch failed: ${devicesResp?.error || 'No response'}`);
        }
        const rows = devicesResp.data?.rows;
        if (!Array.isArray(rows)) {
            console.error('No device list returned');
            throw new Error('No device list returned');
        }
        log(`Step 4: Found ${rows.length} devices`);
        const deviceIds: string[] = [];
        const devices = { ...this.devices$.getValue() };
        for (const device of rows) {
            if (!device?.device_id) continue;
            const cleanId = device.device_id.replace(/:/g, '');
            deviceIds.push(cleanId);
            devices[cleanId] = device;
        }
        if (deviceIds.length === 0) {
            console.error('No valid devices found');
            throw new Error('No valid devices found');
        }
        this.devices$.next(devices);
        log('Step 5: Starting MQTT with devices:', deviceIds);
        this.getDeviceData(mqttToken, deviceIds);
    }

    private getDeviceData(accessToken: string, deviceMacs: string[]): void {
        this.mqttClient = mqtt.connect(mqttHost, {
            clientId: _username + Math.random().toString(16).slice(2, 10),
            username: accessToken,
            password: _password,
            clean: true,
            connectTimeout: 4000,
        });

        this.mqttClient!.on('connect', () => {
            const topics: string[] = [];
            for (const mac of deviceMacs) {
                topics.push(`${mac}/device/response/state`, `${mac}/device/response/client/+`);
                setInterval(() => {
                    this.mqttPublish(mac, new Uint8Array(REGISTERS['REGRequestSettings']));
                }, 2000);
            }
            this.mqttClient?.subscribe(topics);
        });

        this.mqttClient!.on('message', (topic: string, message: any) => {
            const deviceMac = topic.split('/')[0];
            const arr = Object.values(new Uint8Array(message));
            const c = arr.slice(6);
            const e = [];
            for (let t = 0; t < c.length; t += 2) {
                e.push(highLowToInt({high: c[t], low: c[t + 1]}));
            }
            if (e.length === 81 && topic.includes('device/response/client/04')) {
                const activeOutputs = e[41].toString(2).padStart(16, '0').split('');
                const devices = this.devices$.getValue();
                this.devices$.next({
                    ...devices,
                    [deviceMac]: {
                        ...devices[deviceMac],
                        soc: ((e[56] / 1000) * 100).toFixed(1),
                        totalInput: e[6],
                        totalOutput: e[39],
                        usbOutput: activeOutputs[6] === '1',
                        dcOutput: activeOutputs[5] === '1',
                        acOutput: activeOutputs[4] === '1',
                        ledOutput: activeOutputs[3] === '1',
                    },
                });
            } else if (e.length === 81 && topic.includes('device/response/client/data')) {
                const devices = this.devices$.getValue();
                this.devices$.next({
                    ...devices,
                    [deviceMac]: {
                        ...devices[deviceMac],
                        maximumChargingCurrent: e[20],
                        acSilentCharging: e[57] === 1,
                        usbStandbyTime: e[59],
                        acStandbyTime: e[60],
                        dcStandbyTime: e[61],
                        screenRestTime: e[62],
                        stopChargeAfter: e[63],
                        dischargeLowerLimit: e[66],
                        acChargingUpperLimit: e[67],
                        wholeMachineUnusedTime: e[68],
                    },
                });
            }
        });
        this.mqttClient!.on('error', (err) => console.error(err));
    }

    private mqttPublish(deviceMac: string, message: Uint8Array): void {
        const topic = `${deviceMac}/client/request/data`;
        if (this.mqttClient) {
            this.mqttClient.publish(topic, Buffer.from(message), {qos: 1});
        }
    }

    public isAlive(): { name: string; alive: boolean } {
        return {name: 'sydpower-mqtt', alive: true};
    }

    public getAllDevices(): Record<string, any> {
        return this.devices$;
    }

    public getDeviceById(deviceId: string): { error?: string } | any {
        deviceId = deviceId.replace(/:/g, '');
        const devices = this.devices$.getValue();
        if (devices[deviceId]) {
            return devices[deviceId];
        } else {
            return {error: 'Device not found'};
        }
    }

    public async runCommand(deviceId: string, command: string, value?: string): Promise<{
        success?: string;
        error?: string
    }> {
        if (!REGISTERS[command]) {
            return {error: 'Command not found'};
        }
        if (!this.mqttClient) {
            return {error: 'MQTT not connected, cannot send commands.'};
        }
        let message: Uint8Array;
        const register = REGISTERS[command];
        if (typeof register === 'function') {
            message = register(value ?? null);
        } else {
            message = register;
        }
        this.mqttPublish(deviceId, message);
        return {success: `Command ${command} sent`};
    }
}
