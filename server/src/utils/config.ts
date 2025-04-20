import { PLUGIN_NAME } from '../constants';

export interface Config {
  stripeSecretKey?: string;
  callbackUrl?: string; // The response from Stripe will be posted to this URL.
  paymentMethods?: string[]; // List of payment methods that can be used for the checkout.
  allowPromotionCodes?: boolean; // Whether to allow promotion codes or not.
  checkoutSuccessUrl?: string; // The URL to redirect to after a successful payment.
  checkoutCancelUrl?: string; // The URL to redirect to after a canceled payment.
}

type GetConfigFunction = () => Promise<Config>;

const getConfig: GetConfigFunction = async () => await strapi.config.get(`plugin::${PLUGIN_NAME}`);

export { getConfig };
