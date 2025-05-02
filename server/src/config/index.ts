import { Config } from '../utils/config';

export default {
  default: {
    stripeSecretKey: '',
    paypalClientId: '',
    paypalClientSecret: '',
    brandName: '',
    paypalReturnUrl: '',
    paypalCancelUrl: '',
    paypalProductionMode: false,
    callbackUrl: '',
    paymentMethods: ['card'],
    allowPromotionCodes: false,
    checkoutSuccessUrl: '',
    checkoutCancelUrl: ''
  },
  validator(config: Config) {
    const missingConfigs = [];

    if (!config.stripeSecretKey) {
      missingConfigs.push('accessTokenId');
    }

    if (missingConfigs.length > 0) {
      throw new Error(
        `Please remember to set up the file based config for your plugin.  Refer to the "Configuration" of the README for this plugin for additional details.  Configs missing: ${missingConfigs.join(', ')}`
      );
    }
  },
};
