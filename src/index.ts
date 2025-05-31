import type { API } from 'homebridge';

const { Platform } = require('./platform.js');
const { PLATFORM_NAME } = require('./settings.js');

module.exports = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, Platform);
};
