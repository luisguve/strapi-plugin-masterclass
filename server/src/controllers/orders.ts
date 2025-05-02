import type { Core } from '@strapi/strapi';
import { Context } from 'koa';
import { courseQuery } from "./categories";
import { getService } from '../utils';
import { COURSE_MODEL, ORDER_MODEL } from '../utils/types';

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
        user: { fields: ['id'] }
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
    const { user } = ctx.state
    if (!user) {
      return ctx.badRequest("User must be authenticated")
    }

    const { courses, payment_method } = ctx.request.body
    if (!courses || !courses.length) {
      return ctx.badRequest("No items received")
    }

    if (!['credit_card', 'paypal'].includes(payment_method)) {
      return ctx.badRequest("Wrong payment_method: " + payment_method);
    }

    const items = [];
    // Get courses details
    for (let i = 0; i < courses.length; i++) {
      const id = courses[i]
      const course = await strapi.documents(COURSE_MODEL).findOne({
        documentId: id,
        fields: ["title", "price"]
      });
      if (!course) {
        return ctx.badRequest("Course " + id + " not found");
      }
      items.push({
        price: course.price,
        label: course.title
      });
    }

    const params = {
      user,
      payment_method,
      payload: {courses_ids: courses},
      items
    }

    let result

    try {
      result = await getService("payments").create(params)
      if (result.error) {
        return ctx[result.status](result.msg)
      }
    } catch(err) {
      console.log(err);
      return ctx.internalServerError("Something went wrong");
    }

    ctx.body = result
  },
  async confirm(ctx) {
    const { user } = ctx.state
    if (!user) {
      return ctx.badRequest("User must be authenticated")
    }
    const { checkout_session } = ctx.request.body

    const params = {
      user,
      checkout_session
    }

    let order

    try {
      const result = await getService("payments").confirm(params);
      if (result.error) {
        return ctx[result.status](result.msg);
      }
      order = result;
    } catch(err) {
      console.log(err);
      return ctx.internalServerError("Something went wrong");
    }

    if (!order.confirmed) {
      return ctx.badRequest("Could not confirm payment");
    }

    const { courses_ids } = order.payload

    let courses = []

    if (courses_ids && courses_ids.length > 0) {
      courses = await strapi.documents(COURSE_MODEL).findMany({
        filters: {
          id: {
            $in: courses_ids
          }
        },
        ...courseQuery
      })
    }

    // Sign in user to the courses purchased.
    if (courses.length > 0) {
      await getService("courses").signIntoMultipleCourses({user, courses});
    }

    order.courses = courses

    ctx.body = { order }
  }
});
