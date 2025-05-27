import type { Core } from '@strapi/strapi';
import { registerDocServiceMiddleware } from './document-service-middlewares'

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  // Extend the user model by adding a new field called courses
  const user = strapi.contentType('plugin::users-permissions.user')  
  user.attributes = {
    // Spread previous defined attributes
    ...user.attributes,
    // Add new, or override attributes
    courses: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'plugin::masterclass.mc-student-course',
      mappedBy: 'student',
    },
  };

  registerDocServiceMiddleware({ strapi });
};

export default register;
