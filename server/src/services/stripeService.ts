import Stripe from 'stripe';
import { errors } from '@strapi/utils';
import axios from 'axios';
import { Config } from '../utils';

const { ApplicationError } = errors;

const stripeService = ({ strapi }) => ({
  async getStripeClient() {
    const { stripeSecretKey } = await Config.getConfig();

    return new Stripe(stripeSecretKey);
  },

  async createCheckoutSession(
    stripePriceId,
    stripePlanId,
    isSubscription,
    productId,
    productName,
    userEmail
  ) {
    try {
      const stripe = await this.getStripeClient();
      const settings = await Config.getConfig();

      let priceId;
      let paymentMode;
      if (isSubscription) {
        priceId = stripePlanId;
        paymentMode = 'subscription';
      } else {
        priceId = stripePriceId;
        paymentMode = 'payment';
      }

      const price = await stripe.prices.retrieve(priceId);
      //payment Methods
      const PaymentMethods = await strapi
        .plugin('strapi-stripe')
        .service('paymentMethodService')
        .getPaymentMethods(isSubscription, price.currency, settings.paymentMethods);

      // Create Checkout Sessions.
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: paymentMode,
        payment_method_types: [...PaymentMethods],
        customer_email: userEmail,
        allow_promotion_codes: settings.allowPromotionCodes,
        success_url: `${settings.checkoutSuccessUrl}?sessionId={CHECKOUT_SESSION_ID}`,
        cancel_url: `${settings.checkoutCancelUrl}`,
        metadata: {
          productId: `${productId}`,
          productName: `${productName}`,
        },
      });
      return session;
    } catch (error) {
      throw new ApplicationError(error.message);
    }
  },

  async retrieveCheckoutSession(checkoutSessionId) {
    try {
      const stripe = await this.getStripeClient();

      const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
      return session;
    } catch (error) {
      throw new ApplicationError(error.message);
    }
  },

  async sendDataToCallbackUrl(session) {
    try {
      const { callbackUrl } = await Config.getConfig();

      // Return if no callbackUrl is set
      if (!callbackUrl) return;

      await axios.post(callbackUrl, session);
    } catch (error) {
      throw new ApplicationError(error.message);
    }
  },

  // search subscription status by customer email
  async searchSubscriptionStatus(email) {
    try {
      const stripe = await this.getStripeClient();
      const customer = await stripe.customers.list({ email });

      if (customer.data.length === 0) return null;
      const subscription = await stripe.subscriptions.list({ customer: customer.data[0].id });
      if (subscription.data.length === 0) return null;

      return subscription;
    } catch (error) {
      throw new ApplicationError(error.message);
    }
  },
});

export default stripeService;

export type StripeService = ReturnType<typeof stripeService>;
