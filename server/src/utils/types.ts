import { PaymentsService } from '../services/payments';
import { StripeService } from '../services/stripe';
import { PaypalService } from '../services/paypal';
import { CoursesService } from '../services/courses';

const pluginId = 'masterclass';

export type ServiceName = 'paypal' | 'stripe' | 'payments' | 'courses';
export type ServiceType<T> = T extends 'paypal' ? {
  paypal_client_id: string;
  paypal_client_secret: string;
  brand_name: string;
  return_url: string;
  cancel_url: string;
  production_mode: boolean;
  isValidConfig: () => boolean;
  getPaypalAuth: () => Promise<any>;
  createCheckoutSession: (items: any) => Promise<any>;
  get_payment_status: (checkout_session: any) => Promise<any>;
} : T extends 'stripe' ? {
  // Add Stripe service types here
} : T extends 'payments' ? {
  create: (params: any) => Promise<any>;
  confirm: (params: any) => Promise<any>;
} : T extends 'courses' ? {
  signIntoSingleCourse: (user: any, course: any) => Promise<any>;
  signIntoMultipleCourses: (user: any, courses: any) => Promise<any>;
  calculateDuration: (lectures: any) => Promise<any>;
} : never;

export const CATEGORY_MODEL = `plugin::${pluginId}.mc-category` as const;
export const COURSE_MODEL = `plugin::${pluginId}.mc-course` as const;
export const LECTURE_MODEL = `plugin::${pluginId}.mc-lecture` as const;
export const MODULE_MODEL = `plugin::${pluginId}.mc-module` as const;
export const STUDENT_COURSE_MODEL = `plugin::${pluginId}.mc-student-course` as const;
export const ORDER_MODEL = `plugin::${pluginId}.mc-order` as const;
