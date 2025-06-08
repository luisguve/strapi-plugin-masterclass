import stripeService from './stripe';
import paypalService from './paypal';
import paymentsService from './payments';
import coursesService from './courses';

export default {
  stripe: stripeService,
  paypal: paypalService,
  payments: paymentsService,
  courses: coursesService,
};
