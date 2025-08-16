import type { Core } from '@strapi/strapi';
import { getService } from '../utils';
import { ORDER_MODEL } from '../utils/types';

const paymentsService = ({ strapi }: { strapi: Core.Strapi }) => ({
  async create(params) {
    const { user, payment_method, courses } = params

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
    const items = courses.map(course => {
      return {
        price: course.price,
        label: course.title
      }
    });
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

    const result = await getService(serviceName).createCheckoutSession({...params, items});
    if (result.error) {
      return result;
    }

    // Create order
    await strapi.documents(ORDER_MODEL).create({
      data: {
        amount: result.total,
        user,
        confirmed: false,
        checkout_session: result.checkout_session,
        payment_method,
        response: result.data,
        items,
        courses
      }
    })

    return { id: result.checkout_session, ...result }
  },
  async confirm(params) {
    const { checkout_session } = params

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
          fields: ["id", "confirmed", "email"]
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
      } as any
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
