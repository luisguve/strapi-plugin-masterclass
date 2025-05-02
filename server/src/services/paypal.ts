import type { Core } from '@strapi/strapi';
import { Config } from '../utils';
import axios from 'axios';

const SANDBOX_PAYPAL_API = 'https://api-m.sandbox.paypal.com';
const LIVE_PAYPAL_API = 'https://api-m.paypal.com';

const paypalService = ({ strapi }: { strapi: Core.Strapi }) => ({
  paypal_client_id: "",
  paypal_client_secret: "",
  brand_name: "",
  return_url: "",
  cancel_url: "",
  production_mode: false,
  isValidConfig() {
    return (
      this.paypal_client_id     !== "" &&
      this.paypal_client_secret !== "" &&
      this.brand_name           !== "" &&
      this.return_url           !== "" &&
      this.cancel_url           !== ""
    )
  },
  async getPaypalAuth() {
    const { paypal_client_id, paypal_client_secret } = this;
    if (paypal_client_id && paypal_client_secret) {
      return {
        username: paypal_client_id,
        password: paypal_client_secret
      };
    }
    const { paypalClientId, paypalClientSecret } = await Config.getConfig();
    this.paypal_client_id = paypalClientId;
    this.paypal_client_secret = paypalClientSecret;
    return {
      username: paypalClientId,
      password: paypalClientSecret
    };
  },

  async createCheckoutSession(items) {
    // Pay with PayPal: create order with PayPal
    if (!this.isValidConfig()) {
      return {
        error: true,
        status: "notImplemented",
        msg: "Paypal is not properly configured"
      };
    }
    const paypalAuth = await this.getPaypalAuth()

    let checkout_session;
    let total = 0;
    let data;

    items.map(item => {
      total += item.price;
    })

    const reqBody = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: total
        }
      }],
      application_context: {
        brand_name: this.brand_name,
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: this.return_url,
        cancel_url: this.cancel_url
      }
    }
    // https://api-m.sandbox.paypal.com/v2/checkout/orders [POST]

    const url = (this.production_mode ? LIVE_PAYPAL_API : SANDBOX_PAYPAL_API)
      .concat("/v2/checkout/orders")

    const basicAuth = `${paypalAuth.username}:${paypalAuth.password}`

    try {
      const result = await axios.post(url, reqBody, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${Buffer.from(basicAuth).toString("base64")}`
        }
      })
      data = result.data
      checkout_session = data.id
    } catch(err) {
      console.log(err)
      return {
        error: true,
        status: "internalServerError",
        msg: "Error while creating paypal order"
      }
    }
    return { data, checkout_session, total };
  },

  async get_payment_status(checkout_session) {
    // Capture paypal
    if (!this.isValidConfig()) {
      return {
        error: true,
        status: "notImplemented",
        msg: "Paypal is not properly configured"
      };
    }
    const paypalAuth = await this.getPaypalAuth();

    let orderCaptured = false;

    const url = (this.production_mode ? LIVE_PAYPAL_API : SANDBOX_PAYPAL_API)
      .concat(`/v2/checkout/orders/${checkout_session}/capture`);

    try {
      const basicAuth = `${paypalAuth.username}:${paypalAuth.password}`;
      const result = await axios.post(url, {}, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${Buffer.from(basicAuth).toString("base64")}`
        }
      });
      orderCaptured = result.data.status === "COMPLETED";
    } catch(err) {
      if (err.response && err.response.data) {
        const { issue } = err.response.data.details[0];
        if (issue === "ORDER_ALREADY_CAPTURED") {
          orderCaptured = true;
        } else {
          console.log("Error capturing payment:");
          console.log(JSON.stringify(err.response.data));
        }
      } else {
        console.log("Error capturing payment:");
        console.log(JSON.stringify(err.toJSON()));
      }
      if (!orderCaptured) {
        return {
          error: true,
          status: "internalServerError",
          msg: "Unable to verify payment"
        };
      }
    }
    return { orderCaptured };
  }
});

export default paypalService;
export type PaypalService = ReturnType<typeof paypalService>;
