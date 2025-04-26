import Stripe from 'stripe';
import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import axios from 'axios';
import { Config } from '../utils';
import paymentMethods, { CurrencyCode } from './constant';

type PaymentMethodType =
  | 'card'
  | 'sepa_debit'
  | 'us_bank_account'
  | 'alipay'
  | 'klarna'
  | 'sofort'
  | 'ideal';

const { ApplicationError } = errors;

export interface IStripeService {
  getStripeClient: () => Promise<Stripe>;
  createCheckoutSession: (
    stripePriceId: string,
    stripePlanId: string,
    isSubscription: boolean,
    productId: string,
    productName: string,
    userEmail: string
  ) => Promise<Stripe.Checkout.Session>;
  retrieveCheckoutSession: (checkoutSessionId: string) => Promise<Stripe.Checkout.Session>;
  sendDataToCallbackUrl: (session: Stripe.Checkout.Session) => Promise<void>;
  searchSubscriptionStatus: (email: string) => Promise<Stripe.ApiList<Stripe.Subscription> | null>;
  getPaymentMethods: (
    isSubscription: boolean,
    currency: CurrencyCode,
    _paymentMethods: PaymentMethodType[]
  ) => PaymentMethodType[];
}

const stripeService = ({ strapi }: { strapi: Core.Strapi }): IStripeService => ({
  async getStripeClient() {
    const { stripeSecretKey } = await Config.getConfig();
    return new Stripe(stripeSecretKey);
  },

  async createCheckoutSession(
    stripePriceId: string,
    stripePlanId: string,
    isSubscription: boolean,
    productId: string,
    productName: string,
    userEmail: string
  ) {
    try {
      const stripe = await this.getStripeClient();
      const settings = await Config.getConfig();

      let priceId: string;
      let paymentMode: 'payment' | 'subscription';
      if (isSubscription) {
        priceId = stripePlanId;
        paymentMode = 'subscription';
      } else {
        priceId = stripePriceId;
        paymentMode = 'payment';
      }

      const price = await stripe.prices.retrieve(priceId);

      const PaymentMethods = this.getPaymentMethods(
        isSubscription,
        price.currency as CurrencyCode,
        settings.paymentMethods as PaymentMethodType[]
      );

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: paymentMode,
        payment_method_types: PaymentMethods,
        customer_email: userEmail,
        allow_promotion_codes: settings.allowPromotionCodes,
        success_url: `${settings.checkoutSuccessUrl}?sessionId={CHECKOUT_SESSION_ID}`,
        cancel_url: settings.checkoutCancelUrl,
        metadata: {
          productId,
          productName,
        },
      });

      return session;
    } catch (error) {
      throw new ApplicationError(
        error instanceof Error ? error.message : 'Failed to create checkout session'
      );
    }
  },

  async retrieveCheckoutSession(checkoutSessionId: string) {
    try {
      const stripe = await this.getStripeClient();
      const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
      return session;
    } catch (error) {
      throw new ApplicationError(
        error instanceof Error ? error.message : 'Failed to retrieve checkout session'
      );
    }
  },

  async sendDataToCallbackUrl(session: Stripe.Checkout.Session) {
    try {
      const { callbackUrl } = await Config.getConfig();
      if (!callbackUrl) return;

      await axios.post(callbackUrl, session);
    } catch (error) {
      throw new ApplicationError(
        error instanceof Error ? error.message : 'Failed to send data to callback URL'
      );
    }
  },

  async searchSubscriptionStatus(email: string) {
    try {
      const stripe = await this.getStripeClient();
      const customers = await stripe.customers.list({ email });

      if (customers.data.length === 0) return null;

      const subscriptions = await stripe.subscriptions.list({
        customer: customers.data[0].id,
      });

      if (subscriptions.data.length === 0) return null;
      return subscriptions;
    } catch (error) {
      throw new ApplicationError(
        error instanceof Error ? error.message : 'Failed to search subscription status'
      );
    }
  },

  getPaymentMethods(isSubscription, currency, _paymentMethods) {
    const payments: PaymentMethodType[] = [];

    try {
      const { sepaDirectDebit, achDirectDebit, alipay, klarna, sofort, ideal } = paymentMethods;

      // card payment method
      if (_paymentMethods.includes('card')) payments.push('card');

      // sepa payment method
      if (
        _paymentMethods.includes('sepa_debit') &&
        sepaDirectDebit.supportedCurrency.includes(currency)
      )
        payments.push('sepa_debit');

      // ach payment method
      if (
        _paymentMethods.includes('us_bank_account') &&
        achDirectDebit.supportedCurrency.includes(currency)
      )
        payments.push('us_bank_account');

      // alipay payment method
      if (
        _paymentMethods.includes('alipay') &&
        alipay.supportedCurrency.includes(currency) &&
        !isSubscription
      )
        payments.push('alipay');

      // klarna payment method
      if (
        _paymentMethods.includes('klarna') &&
        klarna.supportedCurrency.includes(currency) &&
        !isSubscription
      )
        payments.push('klarna');

      // sofort payment method
      if (_paymentMethods.includes('sofort') && sofort.supportedCurrency.includes(currency))
        payments.push('sofort');

      // ideal payment method
      if (_paymentMethods.includes('ideal') && ideal.supportedCurrency.includes(currency))
        payments.push('ideal');

      // if no payment method is selected then add card payment method
      if (_paymentMethods.length === 0) payments.push('card');

      return payments;
    } catch (error) {
      throw new ApplicationError(error instanceof Error ? error.message : String(error));
    }
  },
});

export default stripeService;
export type StripeService = ReturnType<typeof stripeService>;
