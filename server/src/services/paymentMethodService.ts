import type { Core } from '@strapi/strapi';

import { errors } from '@strapi/utils';

const { ApplicationError } = errors;

import paymentMethodReq from './constant';

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  getPaymentMethods(isSubscription, currency, paymentMethods) {
    const payments = [];

    try {
      const { sepaDirectDebit, achDirectDebit, alipay, klarna, sofort, ideal } = paymentMethodReq;

      // card payment method
      if (paymentMethods.includes('card')) payments.push('card');

      // sepa payment method
      if (
        paymentMethods.includes('sepa_debit') &&
        sepaDirectDebit.supportedCurrency.includes(currency)
      )
        payments.push('sepa_debit');

      // ach payment method
      if (
        paymentMethods.includes('us_bank_account') &&
        achDirectDebit.supportedCurrency.includes(currency)
      )
        payments.push('us_bank_account');

      // alipay payment method
      if (
        paymentMethods.includes('alipay') &&
        alipay.supportedCurrency.includes(currency) &&
        !isSubscription
      )
        payments.push('alipay');

      // klarna payment method
      if (
        paymentMethods.includes('klarna') &&
        klarna.supportedCurrency.includes(currency) &&
        !isSubscription
      )
        payments.push('klarna');

      // sofort payment method
      if (paymentMethods.includes('sofort') && sofort.supportedCurrency.includes(currency))
        payments.push('sofort');

      // ideal payment method
      if (paymentMethods.includes('ideal') && ideal.supportedCurrency.includes(currency))
        payments.push('ideal');

      // if no payment method is selected then add card payment method
      if (paymentMethods.length === 0) payments.push('card');

      return payments;
    } catch (error) {
      throw new ApplicationError(error);
    }
  },
});

export default service;
