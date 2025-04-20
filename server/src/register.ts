import type { Core } from '@strapi/strapi';

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

  // Extend the mux-video-uploader plugin by adding a new field called lecture
  const muxAsset = strapi.contentType('plugin::mux-video-uploader.mux-asset')
  muxAsset.attributes = {
    ...muxAsset.attributes,
    lecture: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'plugin::masterclass.mc-lecture',
      mappedBy: 'video',
    },
  };
};

export default register;
