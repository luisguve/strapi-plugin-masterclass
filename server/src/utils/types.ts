import { PaymentsService } from '../services/payments';
import { StripeService } from '../services/stripe';
import { PaypalService } from '../services/paypal';
import { CoursesService } from '../services/courses';

const pluginId = 'masterclass';

export type ServiceName = 'paypal' | 'stripe' | 'payments' | 'courses';
export type ServiceType<T> = T extends 'paypal' ? 
  PaypalService
 : T extends 'stripe' ? 
  StripeService
 : T extends 'payments' ? 
  PaymentsService
 : T extends 'courses' ? 
  CoursesService
 : never;

export const CATEGORY_MODEL = `plugin::${pluginId}.mc-category` as const;
export const COURSE_MODEL = `plugin::${pluginId}.mc-course` as const;
export const LECTURE_MODEL = `plugin::${pluginId}.mc-lecture` as const;
export const MODULE_MODEL = `plugin::${pluginId}.mc-module` as const;
export const STUDENT_COURSE_MODEL = `plugin::${pluginId}.mc-student-course` as const;
export const ORDER_MODEL = `plugin::${pluginId}.mc-order` as const;
