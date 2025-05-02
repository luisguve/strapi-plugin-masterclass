import type { Core } from '@strapi/strapi';
import { getService } from '../utils';
import { ORDER_MODEL } from 'src/utils/types';

const paymentsService = ({ strapi }: { strapi: Core.Strapi }) => ({
  async create(params) {
    const { user, payment_method, payload, items } = params

    if (!user) {
      return {
        error: true,
        status: "badRequest",
        msg: "User must be authenticated"
      }
    }
    if (!payment_method) {
      return {
        error: true,
        status: "badRequest",
        msg: "Payment method is required"
      }
    }
    if (!["credit_card", "paypal"].includes(payment_method)) {
      return {
        error: true,
        status: "badRequest",
        msg: "Payment method must be either 'credit_card' or 'paypal'"
      }
    }
    let validItems = Array.isArray(items) && items.every(item => {
      return (item.label) && (item.price !== undefined)
    })
    if (!validItems) {
      return {
        error: true,
        status: "badRequest",
        msg: "Invalid format of items: " + JSON.stringify(items)
      }
    }

    let serviceName: "stripe" | "paypal" = "stripe";

    if (payment_method == "credit_card") {
      serviceName = "stripe";
    } else {
      serviceName = "paypal";
    }

    const result = await getService(serviceName).createCheckoutSession(params);
    if (result.error) {
      return result;
    }

    // Create order
    await strapi.documents(ORDER_MODEL).create({
      data: {
        amount: result.total,
        user: user.id,
        confirmed: false,
        checkout_session: result.checkout_session,
        payment_method,
        payload,
        response: result.data,
        items,
      }
    })

    return { id: result.checkout_session, ...result }
  },
  async confirm(params) {
    const { user, checkout_session } = params

    if (!user) {
      return {
        error: true,
        status: "badRequest",
        msg: "User must be authenticated"
      }
    }
    if (!checkout_session) {
      return {
        error: true,
        status: "forbidden",
        msg: "Checkout session must be specified"
      }
    }

    const order = await strapi.documents(ORDER_MODEL).findFirst({
      filters: {
        checkout_session: {
          $eq: checkout_session
        }
      },
      populate: {
        user: {
          fields: ["id"]
        }
      }
    });

    if (!order) {
      return {
        error: true,
        status: "notFound",
        msg: "Order not found"
      }
    }
    if (order.user.id !== user.id) {
      return {
        error: true,
        status: "forbidden",
        msg: "This order does not belong to this user"
      }
    }

    if (order.confirmed) {
      return order
    }

    let serviceName: "stripe" | "paypal" = "stripe";

    if (order.payment_method == "credit_card") {
      serviceName = "stripe";
    } else {
      serviceName = "paypal";
    }

    const result = await getService(serviceName).getPaymentStatus(checkout_session);
    if (result.error) {
      return result;
    }

    if (result !== "paid" && !result.orderCaptured) {
      return {
        error: true,
        status: "badRequest",
        msg: "Unable to verify payment"
      }
    }

    // Mark order as confirmed
    await strapi.documents(ORDER_MODEL).update({
      documentId: order.documentId,
      data: {
        confirmed: true
      }
    })
    order.confirmed = true
    return order
  }
});

export default paymentsService;
export type PaymentsService = {
  create: (params: any) => Promise<any>;
  confirm: (params: any) => Promise<any>;
};
