import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { STUDENT_COURSE_MODEL, LECTURE_MODEL } from '../utils/types';

const { ApplicationError } = errors;

const coursesService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /*
   *  registers student into a single course
   */
  async signIntoSingleCourse(params) {
    const { user, course } = params;
    return await strapi.documents(STUDENT_COURSE_MODEL).create({
      data: {
        student: user,
        course
      }
    })
  },
  /*
   *  registers student into multiple courses
   */
  async signIntoMultipleCourses(params) {
    const { user, courses } = params;
    const student = await strapi.documents("plugin::users-permissions.user").findOne({
      documentId: user.documentId,
      populate: {
        courses: {
          fields: ["id"]
        }
      }
    });
    if (!student) {
      return new ApplicationError("No user found");
    }
    const newCourses = courses.filter(c => {
      return !student.courses.some(({id}) => id === c.id);
    });
    return await Promise.all(newCourses.map(c => {
      return strapi.documents(STUDENT_COURSE_MODEL).create({
        data: {
          student: student.id,
          course: c.id
        }
      });
    }))
  },
  async calculateDuration(lectures) {
    const storedLectures = await strapi.documents(LECTURE_MODEL).findMany({
      filters: {
        id: {
          $in: lectures
        }
      },
      populate: {
        video: {
          fields: ["duration"]
        }
      }
    })
    return storedLectures.reduce((totalDuration, lecture) => {
      if (lecture.video) {
        totalDuration += lecture.video.duration
      }
      return totalDuration
    }, 0)
  },
});

export default coursesService;
export type CoursesService = {
  signIntoSingleCourse: (params: any) => Promise<any>;
  signIntoMultipleCourses: (params: any) => Promise<any>;
  calculateDuration: (lectures: any) => Promise<any>;
};
