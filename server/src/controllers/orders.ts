import type { Core } from '@strapi/strapi';
import { Context } from 'koa';
import { courseQuery } from "./categories";
import { getService } from '../utils';
import { COURSE_MODEL, ORDER_MODEL, STUDENT_COURSE_MODEL } from '../utils/types';
import { v4 as uuidv4 } from 'uuid';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: Context) {
    const { user } = ctx.state
    if (!user) {
      return ctx.badRequest("User must be authenticated");
    }

    const result = await strapi.documents(ORDER_MODEL).findMany({
      filters: {
        user
      },
    })
    ctx.body = {
      orders: result
    }
  },
  /**
   * Retrieve an order by id, only if it belongs to the user
   */
  async findOne(ctx) {
    const { id } = ctx.params;
    const { user } = ctx.state
    if (!user) {
      return ctx.badRequest("User must be authenticated")
    }
    if (!id) {
      return ctx.badRequest("Id is required")
    }

    const order = await strapi.documents(ORDER_MODEL).findOne({
      documentId: id,
      populate: {
        user: { fields: ['id'] },
        courses: true
      }
    })
    if (order && (order.user.id !== user.id)) {
      return ctx.forbidden("This order does not belong to this user");
    }
    ctx.body = {
      order
    }
  },
  async create(ctx) {
    const { courses, payment_method } = ctx.request.body;

    console.log('0here');

    if (!courses || !courses.length) {
      return ctx.badRequest("no items received");
    }

    if (!['credit_card', 'paypal'].includes(payment_method)) {
      return ctx.badRequest("invalid payment_method: " + payment_method);
    }

    let { user } = ctx.state;

    if (user) {
      // Check whether user already has this course.
      const student = await strapi.documents(STUDENT_COURSE_MODEL).findFirst({
        filters: {
          student: {
            documentId: {
              $eq: user.documentId
            }
          },
          course: {
            documentId: {
              $in: courses
            }
          },
        }
      });
      if (student) {
        ctx.body = {};
        return ctx.badRequest("user already purchased this course", { redirectToLogin: true });
      }
    }/* else {
      // Create new user.
      user = await strapi.service('plugin::users-permissions.user').add({
        blocked: false,
        confirmed: false,
        username: email,
        email: email,
        password: uuidv4(),
        provider: 'local',
        role: 1
      });
    }*/

    // Get courses details
    const _courses = await strapi.documents(COURSE_MODEL).findMany({
      filters: {
        documentId: {
          $in: courses
        }
      }
    });
    if (!_courses.length) {
      return ctx.badRequest("courses not found");
    }

    const params = {
      user,
      payment_method,
      courses: _courses
    }

    let result

    try {
      result = await getService("payments").create(params)
      if (result.error) {
        return ctx[result.status](result.msg)
      }
    } catch(err) {
      console.log('orders create error:', err);
      return ctx.internalServerError("something went wrong");
    }

    ctx.body = result
  },
  async confirmWithUser(ctx) {
    const { checkout_session } = ctx.request.body;

    if (!checkout_session) {
      return ctx.badRequest('checkout_session is required');
    }

    let { user } = ctx.state;

    let order = await strapi.documents(ORDER_MODEL).findFirst({
      filters: {
        checkout_session: {
          $eq: checkout_session
        }
      },
      populate: {
        user: {
          fields: ["id", "email"]
        },
        courses: courseQuery
      }
    });

    if (!order) {
      return ctx.badRequest('order not found');
    }
    const email = order.response.customer_email;
    if (user.email != email) {
      return ctx.badRequest('unmatched user and order email');
    }

    const { courses } = order;

    if (order.confirmed) {
      ctx.body = {
        courses,
        is_new_account: false,
        user_email: user.email,
        checkout_session: order.checkout_session,
        id: order.id,
        documentId: order.documentId,
        amount: order.amount,
        confirmed: order.confirmed,
        payment_method: order.payment_method,
        createdAt: order.createdAt,
        publishedAt: order.publishedAt,
        updatedAt: order.updatedAt,
      };
      return;
    }

    try {
      const params = {
        checkout_session
      }
      const result = await getService("payments").confirm(params);
      if (result.error) {
        return ctx[result.status](result.msg);
      }
      order = result;
    } catch(err) {
      console.log(err);
      return ctx.internalServerError("something went wrong");
    }

    if (!order.confirmed) {
      return ctx.badRequest("could not confirm payment");
    }

    // Sign in user to the courses purchased.
    await getService("courses").signIntoMultipleCourses({ user, courses });

    ctx.body = {
      courses,
      is_new_account: false,
      user_email: user.email,
      checkout_session: order.checkout_session,
      id: order.id,
      documentId: order.documentId,
      amount: order.amount,
      confirmed: order.confirmed,
      payment_method: order.payment_method,
      createdAt: order.createdAt,
      publishedAt: order.publishedAt,
      updatedAt: order.updatedAt,
    };
  },
  async confirm(ctx) {
    // There are two possible cases: the user in the order is from either
    // a new account (!user.confirmed) or an existing account.
    const { checkout_session } = ctx.request.body;

    if (!checkout_session) {
      return ctx.badRequest('checkout_session is required');
    }

    let order = await strapi.documents(ORDER_MODEL).findFirst({
      filters: {
        checkout_session: {
          $eq: checkout_session
        }
      },
      populate: {
        user: {
          fields: ["id", "confirmed", "email"]
        },
        courses: courseQuery
      }
    });

    if (!order) {
      return ctx.badRequest('order not found');
    }

    let { user } = order;
    if (!user) {
      user = {
        confirmed: false,
        email: ""
      }
    }

    const { courses } = order;

    if (order.confirmed) {
      ctx.body = {
        courses,
        is_new_account: !user.confirmed,
        user_email: user.email,
        checkout_session: order.checkout_session,
        id: order.id,
        documentId: order.documentId,
        amount: order.amount,
        confirmed: order.confirmed,
        payment_method: order.payment_method,
        createdAt: order.createdAt,
        publishedAt: order.publishedAt,
        updatedAt: order.updatedAt,
      };
      return;
    }

    try {
      const params = { checkout_session };
      const result = await getService("payments").confirm(params);
      if (result.error) {
        return ctx[result.status](result.msg);
      }
      order = result;
    } catch(err) {
      console.log(err);
      return ctx.internalServerError("something went wrong");
    }

    if (!order.confirmed) {
      return ctx.badRequest("could not confirm payment");
    }

    // Sign in user to the courses purchased.
    if (order.user && (courses.length > 0)) {
      await getService("courses").signIntoMultipleCourses({user: order.user, courses});
    }

    ctx.body = {
      courses,
      is_new_account: !user.confirmed,
      user_email: user.email,
      checkout_session: order.checkout_session,
      id: order.id,
      documentId: order.documentId,
      amount: order.amount,
      confirmed: order.confirmed,
      payment_method: order.payment_method,
      createdAt: order.createdAt,
      publishedAt: order.publishedAt,
      updatedAt: order.updatedAt,
    };
  },
  async finishRegister(ctx) {
    const { checkout_session, email, password, username } = ctx.request.body;

    const order = await strapi.documents(ORDER_MODEL).findFirst({
      filters: {
        checkout_session: {
          $eq: checkout_session
        }
      },
      populate: {
        user: {
          fields: ["id", "documentId", "confirmed", "email"]
        }
      }
    });

    if (!order) {
      return ctx.notFound(`order ${checkout_session} not found`);
    }
    if (!order.user) {
      return ctx.badRequest(`order doesn't have an user`);
    }
    if (order.user.email != email) {
      return ctx.badRequest('unmatched user and order email');
    }
    if (order.user.email.confirmed) {
      return ctx.badRequest('user already confirmed');
    }

    await strapi.documents("plugin::users-permissions.user").update({
      documentId: order.user.documentId,
      data: {
        username,
        password,
        confirmed: true
      } as any
    });

    ctx.body = {
      ok: true
    }
  }
});
