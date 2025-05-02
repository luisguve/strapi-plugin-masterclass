import type { Core } from '@strapi/strapi';
import { Context } from 'koa';
import { CATEGORY_MODEL, COURSE_MODEL } from '../utils/types';

export const courseQuery = {
  fields: '*',
  populate: {
    thumbnail: {
      fields: ["name", "url"]
    },
    modules: {
      populate: {
        lectures: {
          fields: []
        }
      }
    },
    category: {
      fields: ["slug", "title", "id"]
    }
  }
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async index(ctx: Context) {
    const categories = await strapi.documents(CATEGORY_MODEL).findMany({
      populate: {
        thumbnail: {
          fields: ["name", "url"]
        },
        courses: courseQuery
      }
    });
    const result = await Promise.all(categories.map(async category => {
      let courses_count = await strapi.documents(COURSE_MODEL).count({
        filters: {
          category: {
            id: {
              $eq: category.id
            }
          }
        }
      })
      category.courses_count = courses_count;
      return category
    }))
    // Sanitize result
    const schema = strapi.getModel(CATEGORY_MODEL);

    ctx.body = {
      categories: await strapi.contentAPI.sanitize.output(result, schema)
    }
  },
  async summary(ctx: Context) {
    const { document_id } = ctx.params
    const category = await strapi.documents(CATEGORY_MODEL).findOne({
      documentId: document_id,
      populate: {
        thumbnail: {
          fields: ["name", "url"]
        },
        courses: courseQuery
      }
    });
    let courses_count = await strapi.documents(COURSE_MODEL).count({
      filters: {
        category: {
          id: {
            $eq: category.id
          }
        }
      }
    });

    category.courses_count = courses_count
    // Sanitize result
    const schema = strapi.getModel(CATEGORY_MODEL);

    ctx.body = {
      category: await strapi.contentAPI.sanitize.output(category, schema)
    }
  },
});
