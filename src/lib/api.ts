import type expressType from 'express';
import type corsType from 'cors';
import type bodyParserType from 'body-parser';
import type {BehaviorSubject} from 'rxjs';
import type {Server} from 'http';
import type {Connector} from '../connector';

const express: typeof expressType = require('express');
const cors: typeof corsType = require('cors');
const bodyParser: typeof bodyParserType = require('body-parser');

export class Api {
    private app = express();
    private server?: Server;
    private readonly devices$: BehaviorSubject<Record<string, DeviceState>>;

    constructor(connector: Connector, devices$: BehaviorSubject<Record<string, DeviceState>>) {
        this.devices$ = connector.devices$
        this.app.use(cors());
        this.app.use(bodyParser.json());
        this.setupRoutes();
    }

    private setupRoutes() {
        this.app.get('/devices', (req, res) => {
            res.json(this.devices$);
        });
        this.app.get('/devices/:deviceId', (req: any, res: any) => {
            const {deviceId} = req.params;
            const device = this.devices$.getValue()[deviceId];
            if (!device) {
                return res.status(404).json({error: 'Device not found'});
            }
            res.json(device);
        });
        this.app.get('/devices/:deviceId/REGEnableACOutput', (req, res) => {
            this.setDeviceState(req.params.deviceId, 'acOutput', true);
            res.json({success: true});
        });
        this.app.get('/devices/:deviceId/REGDisableACOutput', (req, res) => {
            this.setDeviceState(req.params.deviceId, 'acOutput', false);
            res.json({success: true});
        });
        this.app.get('/devices/:deviceId/REGEnableDCOutput', (req, res) => {
            this.setDeviceState(req.params.deviceId, 'dcOutput', true);
            res.json({success: true});
        });
        this.app.get('/devices/:deviceId/REGDisableDCOutput', (req, res) => {
            this.setDeviceState(req.params.deviceId, 'dcOutput', false);
            res.json({success: true});
        });
        this.app.get('/devices/:deviceId/REGEnableInverter', (req, res) => {
            this.setDeviceState(req.params.deviceId, 'inverter', true);
            res.json({success: true});
        });
        this.app.get('/devices/:deviceId/REGDisableInverter', (req, res) => {
            this.setDeviceState(req.params.deviceId, 'inverter', false);
            res.json({success: true});
        });
        this.app.get('/devices/:deviceId/REGEnableLED', (req, res) => {
            this.setDeviceState(req.params.deviceId, 'ledState', true);
            res.json({success: true});
        });
        this.app.get('/devices/:deviceId/REGDisableLED', (req, res) => {
            this.setDeviceState(req.params.deviceId, 'ledState', false);
            res.json({success: true});
        });
    }

    private setDeviceState(deviceId: string, key: string, value: boolean) {
        console.log('setDeviceState', deviceId, key, value)
        const devices = this.devices$.getValue();
        if (!devices[deviceId]) {
            devices[deviceId] = {
                acOutput: false,
                dcOutput: false,
                inverter: false,
                ledState: false,
            };
        }
        devices[deviceId] = {
            ...devices[deviceId],
            [key]: value,
        };
        this.devices$.next({
            ...devices,
        });
    }

    public start(port: number) {
        if (this.server) return;
        this.server = this.app.listen(port);
    }

    public stop() {
        if (this.server) {
            this.server.close();
            this.server = undefined;
        }
    }
}