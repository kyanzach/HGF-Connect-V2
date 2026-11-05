const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Disable Watchman on macOS XAMPP paths where watchman daemon can hang
config.resolver.useWatchman = false;

module.exports = config;
