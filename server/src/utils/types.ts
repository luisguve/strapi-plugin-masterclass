import { StripeService } from '../services/stripeService';

export type ServiceName = 'stripe';
export type ServiceType<T> = T extends 'mux' ? StripeService : never;
