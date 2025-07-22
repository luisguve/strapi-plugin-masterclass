export default [
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
    handler: 'categories.findOne',
    config: {
      policies: [],
    }
  },
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
    path: '/course-details/:courseId',
    handler: 'courses.getCourseDetails',
    config: {
      policies: [],
    }
  },
  {
    method: 'GET',
    path: '/courses/:courseId/classes-completed',
    handler: 'courses.getClassesCompleted',
    config: {
      policies: [],
    }
  },
  {
    method: 'GET',
    path: '/courses/:courseId/get-current-lecture',
    handler: 'courses.getCurrentLecture',
    config: {
      policies: [],
    }
  },
  {
    method: 'GET',
    path: '/courses/:courseId/resume-course',
    handler: 'courses.resumeCourse',
    config: {
      policies: [],
    }
  },
  {
    method: 'GET',
    path: '/courses/:courseId/get-play-auth-lecture',
    handler: 'courses.getPlayAuth',
    config: {
      policies: [],
    }
  },
  {
    method: 'PUT',
    path: '/courses/:courseId/check-lecture',
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
  {
    method: 'PUT',
    path: '/orders/confirm-with-user',
    handler: 'orders.confirmWithUser',
    config: {
      policies: [],
    }
  },
  {
    method: 'PUT',
    path: '/orders/finish-register',
    handler: 'orders.finishRegister',
    config: {
      policies: [],
    }
  },
];
