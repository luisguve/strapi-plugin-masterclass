export type CurrencyCode = 'eur' | 'usd' | 'cny' | 'dkk' | 'gbp' | 'nok' | 'sek' | 'aud' | 'nzd' | 'cad' | 'pln' | 'chf';

interface PaymentMethod {
  supportedCurrency: CurrencyCode[];
}

interface PaymentMethods {
  sepaDirectDebit: PaymentMethod;
  achDirectDebit: PaymentMethod;
  alipay: PaymentMethod;
  klarna: PaymentMethod;
  sofort: PaymentMethod;
  ideal: PaymentMethod;
}

const paymentMethods: PaymentMethods = {
  sepaDirectDebit: {
    supportedCurrency: ['eur'],
  },
  achDirectDebit: {
    supportedCurrency: ['usd'],
  },
  alipay: {
    supportedCurrency: ['usd', 'cny'],
  },
  klarna: {
    supportedCurrency: ['dkk', 'gbp', 'nok', 'sek', 'usd', 'aud', 'nzd', 'cad', 'pln', 'chf'],
  },
  sofort: {
    supportedCurrency: ['eur'],
  },
  ideal: {
    supportedCurrency: ['eur'],
  },
};

export default paymentMethods;