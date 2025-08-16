import Stripe from 'stripe';
import type { Core } from '@strapi/strapi';
import { Config } from '../utils';

/**
 * Given a dollar amount number, convert it to it's value in cents
 * @param number 
 */
const fromDecimalToInt = (number: number): number => Math.round(number * 100);

const stripeService = ({ strapi }: { strapi: Core.Strapi }) => ({
  stripe_client: null,
  success_url: "",
  cancel_url: "",
  async getStripeClient() {
    const { stripe_client } = this;
    if (stripe_client) {
      return stripe_client;
    }
    const { stripeSecretKey, checkoutSuccessUrl, checkoutCancelUrl } = await Config.getConfig();
    this.success_url = checkoutSuccessUrl;
    this.cancel_url = checkoutCancelUrl;
    return new Stripe(stripeSecretKey);
  },

  async createCheckoutSession(params) {
    const { items, user } = params;
    // Pay with credit card: create order with Stripe
    const stripeClient = await this.getStripeClient();
    if (!stripeClient) {
      console.log("Stripe is not properly configured");
      console.log({config: await Config.getConfig()});
      return {
        error: true,
        status: "notImplemented",
        msg: "Stripe is not properly configured"
      };
    }
    let checkout_session;
    let total = 0;
    let data;
    const checkoutData = {
      payment_method_types: ["card"],
      line_items: items.map(item => {
        total += item.price;
        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: item.label
            },
            unit_amount: fromDecimalToInt(item.price),
          },
          quantity: 1
        };
      }),
      mode: "payment",
      success_url: `${this.success_url}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.cancel_url}?session_id={CHECKOUT_SESSION_ID}`,
    };
    if (user) {
      checkoutData['customer_email'] = user.email;
    }
    try {
      const session = await stripeClient.checkout.sessions.create(checkoutData);
      data = session;
      checkout_session = session.id;
    } catch(err) {
      console.log('stripe error:', err)
      return {
        error: true,
        status: "internalServerError",
        msg: "Error while creating stripe order"
      }
    }
    return { data, checkout_session, total };
  },

  async getPaymentStatus(checkout_session) {
    let session;

    const stripeClient = await this.getStripeClient();
    if (!stripeClient) {
      console.log("Stripe is not properly configured");
      console.log({config: await Config.getConfig()});
      return {
        error: true,
        status: "notImplemented",
        msg: "Stripe is not properly configured"
      };
    }
    try {
      session = await stripeClient.checkout.sessions.retrieve(checkout_session)
    } catch(err) {
      return {
        error: true,
        status: "notFound",
        msg: "Checkout ID " + checkout_session + " not found"
      };
    }
    console.log("session:");
    console.dir(session, { depth: null });
    return session.payment_status;
  }
});

export default stripeService;
export type StripeService = {
  createCheckoutSession: (params: any) => Promise<any>;
  getPaymentStatus: (params: any) => Promise<any>;
};
