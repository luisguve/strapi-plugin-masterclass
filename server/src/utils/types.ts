import { StripeService } from '../services/stripe';
import { MasterclassService } from '../services/masterclass';

export type ServiceName = 'stripe' | 'masterclass';
export type ServiceType<T> = T extends 'stripe' ? StripeService : T extends 'masterclass' ? MasterclassService : never;
