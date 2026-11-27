const { storeOrigin } = require('./store-url');

module.exports = ({ config }) => {
  if (process.env.EAS_BUILD_PROFILE === 'production') {
    const storeUrl = storeOrigin(process.env.EXPO_PUBLIC_STORE_URL);
    if (!storeUrl || !storeUrl.startsWith('https://')) {
      throw new Error('Production builds require EXPO_PUBLIC_STORE_URL to be a live HTTPS origin.');
    }
  }

  return config;
};
