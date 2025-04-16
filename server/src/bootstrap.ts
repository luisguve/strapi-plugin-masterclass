import type { Core } from '@strapi/strapi';

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  if (!strapi.plugins['mux-video-uploader']) {
    throw new Error(
      'The Mux Video Uploader plugin is required. Please install strapi-plugin-mux-video-uploader.'
    );
  }
};

export default bootstrap;
