import { PLUGIN_NAME } from '../constants';
import * as Config from './config';
import { ServiceName, ServiceType } from './types';

const getService = <T extends ServiceName>(name: T): ServiceType<T> => {
  const service = strapi.plugin(PLUGIN_NAME).service(name);
  if (name === 'payments') {
    return service as ServiceType<T>;
  }
  return service as ServiceType<T>;
};

export { getService, Config };
