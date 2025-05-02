export default [
  {
    method: 'GET',
    path: '/courses',
    handler: 'courses.find',
    config: {
      policies: [],
    }
  },
  {
    method: 'GET',
    path: '/courses/:slug',
    handler: 'courses.findOne',
    config: {
      policies: [],
    }
  },
  {
    method: 'GET',
    path: '/courses-slugs',
    handler: 'courses.findSlugs',
    config: {
      policies: [],
    }
  },
  {
    method: 'GET',
    path: '/course-details/:id',
    handler: 'courses.getCourseDetails',
    config: {
      policies: [],
    }
  },
  {
    method: 'GET',
    path: '/courses/:id/classes-completed',
    handler: 'courses.getClassesCompleted',
    config: {
      policies: [],
    }
  },
  {
    method: 'GET',
    path: '/courses/:id/resume-course',
    handler: 'courses.resumeCourse',
    config: {
      policies: [],
    }
  },
  {
    method: 'GET',
    path: '/courses/:id/get-play-auth-lecture',
    handler: 'courses.getPlayAuth',
    config: {
      policies: [],
    }
  },
  {
    method: 'PUT',
    path: '/courses/:id/check-lecture',
    handler: 'courses.checkLecture',
    config: {
      policies: [],
    }
  },
  {
    method: 'GET',
    path: '/my-items-purchased',
    handler: 'courses.getItemsPurchased',
    config: {
      policies: [],
    }
  },
  {
    method: 'GET',
    path: '/my-learning',
    handler: 'courses.getMyLearning',
    config: {
      policies: [],
    }
  },
  {
    method: 'GET',
    path: '/categories/index',
    handler: 'categories.index',
    config: {
      policies: [],
    }
  },
  {
    method: 'GET',
    path: '/categories/:slug',
    handler: 'categories.summary',
    config: {
      policies: [],
    }
  },
  {
    method: 'GET',
    path: '/orders',
    handler: 'orders.find',
    config: {
      policies: [],
    }
  },
  {
    method: 'GET',
    path: '/orders/:id',
    handler: 'orders.findOne',
    config: {
      policies: [],
    }
  },
  {
    method: 'POST',
    path: '/orders',
    handler: 'orders.create',
    config: {
      policies: [],
    }
  },
  {
    method: 'PUT',
    path: '/orders/confirm',
    handler: 'orders.confirm',
    config: {
      policies: [],
    }
  },
];
