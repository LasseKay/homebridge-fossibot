import type { API } from 'homebridge';

const { FossibotHomebridgePlatform } = require('./platform.js');
const { PLATFORM_NAME } = require('./settings.js');

module.exports = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, FossibotHomebridgePlatform);
};
