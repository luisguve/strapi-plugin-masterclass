import type { Core } from '@strapi/strapi';

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  if (!strapi.plugins['mux-video-uploader']) {
    throw new Error(
      'The Mux Video Uploader plugin is required. Please install strapi-plugin-mux-video-uploader.'
    );
  }
  if (!strapi.plugins['@strapi/plugin-seo']) {
    throw new Error(
      'The @strapi/plugin-seo plugin is required. Please install @strapi/plugin-seo.'
    );
  }
};

export default bootstrap;
