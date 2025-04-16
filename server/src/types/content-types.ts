interface Media {
  id: number;
  name: string;
  alternativeText?: string;
  caption?: string;
  width?: number;
  height?: number;
  formats?: any;
  hash: string;
  ext?: string;
  mime: string;
  size: number;
  url: string;
  previewUrl?: string;
  provider: string;
  provider_metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface McCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  courses?: McCourse[];
  featured_courses?: McCourse[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface McCourse {
  id: number;
  title: string;
  description: string;
  price: number;
  duration?: number;
  thumbnail?: Media;
  slug: string;
  long_description?: string;
  category?: McCategory;
  featured_in?: McCategory[];
  modules?: McModule[];
  students?: McStudentCourse[];
  modules_order?: any;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface McModule {
  id: number;
  title: string;
  description?: string;
  order: number;
  lectures?: McLecture[];
  course?: McCourse;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface McLecture {
  id: number;
  title: string;
  order: number;
  resource?: McResource;
  module?: McModule;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface McResource {
  id: number;
  title: string;
  type: 'video' | 'document' | 'link';
  muxAsset?: any; // Replace with proper Mux Asset type when available
  file?: Media;
  url?: string;
  lectures?: McLecture[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface McStudent {
  id: number;
  user: any; // Replace with proper User type when available
  courses?: McStudentCourse[];
  progress?: any;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface McStudentCourse {
  id: number;
  student: McStudent;
  course: McCourse;
  enrolled_at: string;
  completed_at?: string;
  progress?: any;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

declare module '@strapi/strapi' {
  export interface Shared {
    contentTypes: {
      'plugin::masterclass.mc-category': McCategory;
      'plugin::masterclass.mc-course': McCourse;
      'plugin::masterclass.mc-module': McModule;
      'plugin::masterclass.mc-lecture': McLecture;
      'plugin::masterclass.mc-resource': McResource;
      'plugin::masterclass.mc-student': McStudent;
      'plugin::masterclass.mc-student-course': McStudentCourse;
    };
  }
}