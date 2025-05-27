import { LECTURE_MODEL, MODULE_MODEL, COURSE_MODEL } from './utils/types';

const pageActions = ['create', 'update', 'delete'];

const LectureActions = {
  async create(context, strapi) {
    let connectVideo = [];
    let connectModule = [];

    if (context.params.data.video) {
      const { connect } = context.params.data.video;
      connectVideo = connect ? connect : [];
    }

    if (context.params.data.module) {
      const { connect } = context.params.data.module;
      connectModule = connect ? connect : [];
    }

    if (!connectVideo.length) {
      context.params.data.duration = 0;
      return;
    }

    // Get duration of video.
    const videoDocumentId = connectVideo[0].documentId;
    const video = await strapi.documents('plugin::mux-video-uploader.mux-asset').findOne({
      documentId: videoDocumentId,
      fields: ['duration'],
    });

    if (!video) {
      return;
    }
    const videoDuration = Math.floor(video.duration ? video.duration : 0);
    context.params.data.duration = videoDuration;

    if (!connectModule.length) {
      return;
    }

    // Get module being connected to the lecture.
    const moduleDocumentId = connectModule[0].documentId;
    const module = await strapi.documents(MODULE_MODEL).findOne({
      documentId: moduleDocumentId,
      fields: ['duration'],
      populate: {
        course: {
          fields: ['duration', 'documentId']
        }
      }
    });

    if (!module) {
      return;
    }

    await strapi.documents(MODULE_MODEL).update({
      documentId: moduleDocumentId,
      data: {
        duration: module.duration ? module.duration + videoDuration : videoDuration
      }
    });

    const { course } = module;
    // Update the duration of the module's course if any
    if (!course) {
      return;
    }

    await strapi.documents(COURSE_MODEL).update({
      documentId: course.documentId,
      data: {
        duration: course.duration ? course.duration + videoDuration : videoDuration
      }
    });
  },
  async update(context, strapi) {
    let connectVideo = [];
    let disconnectVideo = [];

    let connectModule = [];
    let disconnectModule = [];

    if (context.params.data.video) {
      const { connect, disconnect } = context.params.data.video;
      connectVideo = connect ? connect : [];
      disconnectVideo = disconnect ? disconnect : [];
    }
    if (context.params.data.module) {
      const { connect, disconnect } = context.params.data.module;
      connectModule = connect ? connect : [];
      disconnectModule = disconnect ? disconnect : [];
    }

    let oldVideoDuration = context.params.data.duration ? context.params.data.duration : 0;
    let newVideoDuration = context.params.data.duration ? context.params.data.duration : 0;

    // Check if a video is being disconnected
    if (disconnectVideo.length > 0) {
      // Removing video; get the duration of the old video.
      context.params.data.duration = 0;
      const videoDocumentId = disconnectVideo[0].documentId;
      const video = await strapi.documents('plugin::mux-video-uploader.mux-asset').findOne({
        documentId: videoDocumentId,
        fields: ['duration'],
      });
      if (video) {
        oldVideoDuration = Math.floor(video.duration ? video.duration : 0);
      }
    }
    // Check if a video is being connected
    if (connectVideo.length > 0) {
      // Attaching video; get the duration of the new video.
      const videoDocumentId = connectVideo[0].documentId;
      const video = await strapi.documents('plugin::mux-video-uploader.mux-asset').findOne({
        documentId: videoDocumentId,
        fields: ['duration'],
      });
      if (video) {
        const duration = Math.floor(video.duration ? video.duration : 0);
        context.params.data.duration = duration;
        newVideoDuration = duration;
      }
    }

    if (!connectModule.length && !disconnectModule.length) {
      // Not changing module; return
      return;
    }

    // Check if a module is being disconnected
    if (disconnectModule.length && (oldVideoDuration > 0)) {
      // Removing module; adjust the duration of the old module and its course if any.
      const moduleDocumentId = disconnectModule[0].documentId;
      const module = await strapi.documents(MODULE_MODEL).findOne({
        documentId: moduleDocumentId,
        fields: ['duration'],
        populate: {
          course: {
            fields: ['duration', 'documentId']
          }
        }
      });
      if (module) {
        let newModuleDuration = 0;
        if (
          module.duration &&
          ((module.duration - oldVideoDuration) > 0)
        ) {
          newModuleDuration = module.duration - oldVideoDuration;
        }
        await strapi.documents(MODULE_MODEL).update({
          documentId: moduleDocumentId,
          data: {
            duration: newModuleDuration
          }
        });

        const { course } = module;
        // Update the duration of the module's course if any
        if (course) {
          let newCourseDuration = 0;
          if (
            course.duration &&
            ((course.duration - oldVideoDuration) > 0)
          ) {
            newCourseDuration = course.duration - oldVideoDuration;
          }
          await strapi.documents(COURSE_MODEL).update({
            documentId: course.documentId,
            data: {
              duration: newCourseDuration
            }
          });
        }
      }
    }
    // Check if a module is being connected
    if (connectModule.length && (newVideoDuration > 0)) {
      // Attaching module; adjust the duration of the new module and its course if any.
      const moduleDocumentId = connectModule[0].documentId;
      const module = await strapi.documents(MODULE_MODEL).findOne({
        documentId: moduleDocumentId,
        fields: ['duration'],
        populate: {
          course: {
            fields: ['duration', 'documentId']
          }
        }
      });
      if (module) {
        let newModuleDuration = newVideoDuration;
        if (module.duration) {
          newModuleDuration = module.duration + newVideoDuration;
        }
        await strapi.documents(MODULE_MODEL).update({
          documentId: moduleDocumentId,
          data: {
            duration: newModuleDuration
          }
        });

        const { course } = module;
        // Update the duration of the module's course if any
        if (course) {
          let newCourseDuration = newVideoDuration;
          if (course.duration) {
            newCourseDuration = course.duration + newVideoDuration;
          }
          await strapi.documents(COURSE_MODEL).update({
            documentId: course.documentId,
            data: {
              duration: newCourseDuration
            }
          });
        }
      }
    }
  },
  // WARNING: This is not going to update the module or course durations correctly
  // if invoked from bulk delete from the content manages due to race conditions.
  async delete(context, strapi) {
    const lecture = await strapi.documents(LECTURE_MODEL).findOne({
      documentId: context.params.documentId,
      fields: ['duration'],
      populate: {
        module: {
          fields: ['duration'],
          populate: {
            course: {
              fields: ['duration', 'documentId']
            }
          }
        }
      }
    });
    const { module } = lecture;

    // Check if the lecture is not part of any module.
    if (!module) {
      return;
    }

    // Check if the duration of the lecture is 0.
    const videoDuration = lecture.duration ? lecture.duration : 0;
    if (!videoDuration) {
      return;
    }

    // console.log('current module duration:', module.duration);

    // Adjust the duration of the module and its course if any.
    let newModuleDuration = 0;
    if (
      module.duration &&
      ((module.duration - videoDuration) > 0)
    ) {
      newModuleDuration = module.duration - videoDuration;
    }
    await strapi.documents(MODULE_MODEL).update({
      documentId: module.documentId,
      data: {
        duration: newModuleDuration
      }
    });
    // console.log('new module duration:', newModuleDuration);

    const { course } = module;
    // Update the duration of the module's course if any
    if (course) {
      let newCourseDuration = 0;
      if (
        course.duration &&
        ((course.duration - videoDuration) > 0)
      ) {
        newCourseDuration = course.duration - videoDuration;
      }
      await strapi.documents(COURSE_MODEL).update({
        documentId: course.documentId,
        data: {
          duration: newCourseDuration
        }
      });
    }
  }
};

const ModuleActions = {
  async create(context, strapi) {
    // Set module duration to 0.
    context.params.data.duration = 0;

    // Get the lectures and course being connected with this module.
    let connectLectures = [];
    let connectCourse = [];

    if (context.params.data.lectures) {
      const { connect } = context.params.data.lectures;
      connectLectures = connect ? connect : [];
    }

    if (context.params.data.course) {
      const { connect } = context.params.data.course;
      connectCourse = connect ? connect : [];
    }

    if (!connectLectures.length) {
      return;
    }

    // Get total duration of lectures.
    let totalLecturesDuration = 0;
    await Promise.all(connectLectures.map(async (connectLecture) => {
      const lectureDocumentId = connectLecture.documentId;
      const lecture = await strapi.documents(LECTURE_MODEL).findOne({
        documentId: lectureDocumentId,
        fields: ['duration'],
      });
      if (lecture && (lecture.duration > 0)) {
        totalLecturesDuration += lecture.duration;
      }
    }));

    if (!(totalLecturesDuration > 0)) {
      return;
    }

    context.params.data.duration = totalLecturesDuration;

    if (!connectCourse.length) {
      return;
    }

    // Adjust the duration of the course.
    const courseDocumentId = connectCourse[0].documentId;
    const course = await strapi.documents(COURSE_MODEL).findOne({
      documentId: courseDocumentId,
      fields: ['duration'],
    });
    if (!course) {
      return;
    }

    const newCourseDuration = course.duration ? course.duration + totalLecturesDuration : totalLecturesDuration;
    await strapi.documents(COURSE_MODEL).update({
      documentId: courseDocumentId,
      data: {
        duration: newCourseDuration
      }
    });
  },
  async update(context, strapi) {
    // Get the lectures and course being connected or disconnected with this module.
    let connectLectures = [];
    let disconnectLectures = [];

    let connectCourse = [];
    let disconnectCourse = [];

    if (context.params.data.lectures) {
      const { connect, disconnect } = context.params.data.lectures;
      connectLectures = connect ? connect : [];
      disconnectLectures = disconnect ? disconnect : [];
    }

    if (context.params.data.course) {
      const { connect, disconnect } = context.params.data.course;
      connectCourse = connect ? connect : [];
      disconnectCourse = disconnect ? disconnect : [];
    }

    let removedLecturesDuration = 0;
    let addedLecturesDuration = 0;
    if (disconnectLectures.length) {
      // Removing lectures from the module.
      // Get every lecture and add its duration to removedLecturesDuration.
      await Promise.all(disconnectLectures.map(async (disconnectLecture) => {
        const lectureDocumentId = disconnectLecture.documentId;
        const lecture = await strapi.documents(LECTURE_MODEL).findOne({
          documentId: lectureDocumentId,
          fields: ['duration']
        });

        if (lecture && (lecture.duration > 0)) {
          removedLecturesDuration += lecture.duration;
        }
      }));
    }
    if (connectLectures.length) {
      // Adding lectures to the module.
      // Get every lecture and add its duration to addedLecturesDuration.
      await Promise.all(connectLectures.map(async (connectLecture) => {
        const lectureDocumentId = connectLecture.documentId;
        const lecture = await strapi.documents(LECTURE_MODEL).findOne({
          documentId: lectureDocumentId,
          fields: ['duration']
        });

        if (lecture && (lecture.duration > 0)) {
          addedLecturesDuration += lecture.duration;
        }
      }));
    }

    const diffModuleDuration = addedLecturesDuration - removedLecturesDuration;
    const currentModuleDuration = context.params.data.duration ? context.params.data.duration : 0;

    const newModuleDuration = currentModuleDuration + diffModuleDuration;
    context.params.data.duration = newModuleDuration;

    if (disconnectCourse.length && (currentModuleDuration > 0)) {
      // Removing module from a course.
      // Adjust the duration of the course.
      const courseDocumentId = disconnectCourse[0].documentId;
      const course = await strapi.documents(COURSE_MODEL).findOne({
        documentId: courseDocumentId,
        fields: ['duration']
      });
      if (course) {
        let newCourseDuration = course.duration ? course.duration - currentModuleDuration : 0;
        await strapi.documents(COURSE_MODEL).update({
          documentId: courseDocumentId,
          data: {
            duration: newCourseDuration
          }
        });
      }
    }
    if (connectCourse.length) {
      // Adding module to a course.
      // Adjust the duration of the course.
      const courseDocumentId = connectCourse[0].documentId;
      const course = await strapi.documents(COURSE_MODEL).findOne({
        documentId: courseDocumentId,
        fields: ['duration']
      });
      if (course) {
        let newCourseDuration = course.duration ? course.duration + newModuleDuration : newModuleDuration;
        await strapi.documents(COURSE_MODEL).update({
          documentId: courseDocumentId,
          data: {
            duration: newCourseDuration
          }
        });
      }
    }
    // Check whether a course has been connected or disconnected.
    // Either case, there's nothing else to be done; the module wasn't part of any course.
    // Otherwise, get the module and check whether it's part of a course.
    // If so, adjust the duration of the course if diffModuleDuration != 0.
    if (disconnectCourse.length || connectCourse.length) {
      return;
    }

    // Get the module and populate with the course.
    const module = await strapi.documents(MODULE_MODEL).findOne({
      documentId: context.params.documentId,
      populate: {
        course: {
          fields: ['duration', 'documentId'],
        }
      }
    });
    // Adjust the duration of the course associated with the module, if any.
    if (module && module.course && (diffModuleDuration != 0)) {
      const { course } = module;

      let newCourseDuration = course.duration ? course.duration + diffModuleDuration : newModuleDuration;
      await strapi.documents(COURSE_MODEL).update({
        documentId: course.documentId,
        data: {
          duration: newCourseDuration
        }
      });
    }
  },
  // WARNING: This is not going to update the module or course durations correctly
  // if invoked from bulk delete from the content manages due to race conditions.
  async delete(context, strapi) {
    const module = await strapi.documents(MODULE_MODEL).findOne({
      documentId: context.params.documentId,
      fields: ['duration'],
      populate: {
        course: {
          fields: ['duration', 'documentId']
        }
      }
    });

    const { course } = module;
    // Check if the module is not part of any course.
    if (!module) {
      return;
    }

    // Check if the duration of the module is 0.
    const moduleDuration = module.duration ? module.duration : 0;
    if (!moduleDuration) {
      return;
    }

    // Adjust the duration of the course.
    if (course) {
      let newCourseDuration = 0;
      if (
        course.duration &&
        ((course.duration - moduleDuration) > 0)
      ) {
        newCourseDuration = course.duration - moduleDuration;
      }
      await strapi.documents(COURSE_MODEL).update({
        documentId: course.documentId,
        data: {
          duration: newCourseDuration
        }
      });
    }
  }
};

const CourseActions = {
  async create(context, strapi) {
    let connectModules = [];

    if (context.params.data.modules) {
      const { connect } = context.params.data.modules;
      connectModules = connect ? connect : [];
    }

    if (!connectModules.length) {
      context.params.data.duration = 0;
      return;
    }

    // Get total duration of modules.
    let totalModulesDuration = 0;
    await Promise.all(connectModules.map(async (connectModule) => {
      const moduleDocumentId = connectModule.documentId;
      const module = await strapi.documents(MODULE_MODEL).findOne({
        documentId: moduleDocumentId,
        fields: ['duration'],
      });
      if (module && (module.duration > 0)) {
        totalModulesDuration += module.duration;
      }
    }));

    if (!(totalModulesDuration > 0)) {
      return;
    }

    context.params.data.duration = totalModulesDuration;
  },
  async update(context, strapi) {
    // Get the modules being connected or disconnected from this course.
    let connectModules = [];
    let disconnectModules = [];

    if (context.params.data.modules) {
      const { connect, disconnect } = context.params.data.modules;
      connectModules = connect ? connect : [];
      disconnectModules = disconnect ? disconnect : [];
    }

    if (!connectModules.length && !disconnectModules.length) {
      return;
    }

    let removedModulesDuration = 0;
    let addedModulesDuration = 0;
    if (disconnectModules.length) {
      // Removing modules from the module.
      // Get every module and add its duration to removedModulesDuration.
      await Promise.all(disconnectModules.map(async (disconnectModule) => {
        const moduleDocumentId = disconnectModule.documentId;
        const module = await strapi.documents(MODULE_MODEL).findOne({
          documentId: moduleDocumentId,
          fields: ['duration']
        });

        if (module && (module.duration > 0)) {
          removedModulesDuration += module.duration;
        }
      }));
    }
    if (connectModules.length) {
      // Adding modules to the module.
      // Get every module and add its duration to addedModulesDuration.
      await Promise.all(connectModules.map(async (connectModule) => {
        const moduleDocumentId = connectModule.documentId;
        const module = await strapi.documents(MODULE_MODEL).findOne({
          documentId: moduleDocumentId,
          fields: ['duration']
        });

        if (module && (module.duration > 0)) {
          addedModulesDuration += module.duration;
        }
      }));
    }

    const diffCourseDuration = addedModulesDuration - removedModulesDuration;
    const currentCourseDuration = context.params.data.duration ? context.params.data.duration : 0;

    const newCourseDuration = currentCourseDuration + diffCourseDuration;
    context.params.data.duration = newCourseDuration;
  },
  async delete(context, strapi) {}
};

export const registerDocServiceMiddleware = ({ strapi }) => {
	strapi.documents.use(async (context, next) => {

	  if (context.uid.endsWith('mc-lecture') && pageActions.includes(context.action)) {
      await LectureActions[context.action](context, strapi);
	  }
    if (context.uid.endsWith('mc-module') && pageActions.includes(context.action)) {
      await ModuleActions[context.action](context, strapi);
	  }
    if (context.uid.endsWith('mc-course') && pageActions.includes(context.action)) {
      await CourseActions[context.action](context, strapi);
	  }

	  return next();
	});
};
