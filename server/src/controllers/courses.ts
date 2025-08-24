import type { Core } from '@strapi/strapi';
import { Context } from 'koa';
import { COURSE_MODEL, STUDENT_COURSE_MODEL, LECTURE_MODEL } from '../utils/types';

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: Context) {
    let courses = await strapi.documents(COURSE_MODEL).findMany({
      populate: {
        seo: {
          populate: {
            metaImage: {
              fields: ["alternativeText", "url"]
            },
            openGraph: {
              populate: {
                ogImage: {
                  fields: ["alternativeText", "url"]
                }
              }
            }
          }
        },
        thumbnail: {
          fields: ["name", "url"]
        },
        modules: {
          fields: ["title", "duration", "slug"],
          populate: {
            lectures: {
              fields: ["title", "duration", "slug", "description"],
            }
          }
        },
        category: {
          fields: ["slug", "title", "id"]
        },
        students: {
          fields: ["documentId"]
        },
        instructor: {
          fields: ["name", "slug", "bio", "designation"],
          populate: {
            image: {
              fields: ["name", "url"]
            }
          }
        }
      }
    });
    // Add the number of students and total lectures to each course
    courses = courses.map(course => {
      const totalLectures = course.modules.reduce((acc, module) => {
        return acc + module.lectures.length
      }, 0)
      return {
        ...course,
        total_students: course.students.length,
        total_lectures: totalLectures
      }
    });
    ctx.body = { courses }
  },
  async findOne(ctx: Context) {
    const { slug } = ctx.params
    let course = await strapi.documents(COURSE_MODEL).findFirst({
      filters: { slug: { $eq: slug } },
      populate: {
        thumbnail: {
          fields: ["name", "url"]
        },
        modules: {
          fields: ["title", "duration", "description", "slug"],
          populate: {
            lectures: {
              fields: ["title", "duration", "slug", "description"],
            }
          }
        },
        seo: {
          populate: {
            metaImage: {
              fields: ["alternativeText", "url"]
            },
            openGraph: {
              populate: {
                ogImage: {
                  fields: ["alternativeText", "url"]
                }
              }
            }
          }
        },
        category: {
          fields: ["slug", "title", "id"]
        },
        instructor: {
          fields: ["name", "slug", "bio", "designation"],
          populate: {
            image: {
              fields: ["name", "url"]
            }
          }
        },
        students: {
          fields: ["documentId"]
        },
      }
    });
    const totalLectures = course.modules.reduce((acc, module) => {
      return acc + module.lectures.length
    }, 0)
    course = {
      ...course,
      total_students: course.students.length,
      total_lectures: totalLectures
    }
    ctx.body = { course }
  },
  async findSlugs(ctx: Context) {
    const courses = await strapi.documents(COURSE_MODEL).findMany({
      filters: {},
      fields: ["slug"]
    })
    ctx.body = { courses }
  },
  /*
  * Get the classes the user (if any) has marked as seen and the number of students
  */
  async getCourseDetails(ctx: Context) {
    const { user } = ctx.state
    const { courseId } = ctx.params
    let classesCompleted = []
    if (user) {
      // Get user progress
      const student = await strapi.documents(STUDENT_COURSE_MODEL).findFirst(
        {
          filters: {
            student: { documentId: { $eq: user.documentId } },
            course: { documentId: { $eq: courseId } }
          },
          populate: {
            lectures_completed: {
              fields: ["documentId", "slug"]
            },
            current_lecture: {
              fields: ["documentId", "slug"]
            }
          }
        }
      )
      if (student) {
        classesCompleted = student.lectures_completed
      }
    }
    const students = await strapi.documents(STUDENT_COURSE_MODEL).count({
      filters: {
        course: { documentId: { $eq: courseId } }
      }
    })
    ctx.body = { classesCompleted, students }
  },
  /*
  * Get user progress
  */
  async getClassesCompleted(ctx: Context) {
    const { user } = ctx.state
    const { courseId } = ctx.params
    if (!user) {
      return ctx.badRequest("There must be an user")
    }
    const student = await strapi.documents(STUDENT_COURSE_MODEL).findFirst(
      {
        filters: {
          student: { documentId: { $eq: user.documentId } },
          course: { documentId: { $eq: courseId } }
        },
        populate: {
          lectures_completed: {
            fields: ["id", "slug"]
          }
        }
      }
    )
    if (!student) {
      return ctx.badRequest("No access to this course")
    }
    ctx.body = { classesCompleted: student.lectures_completed }
  },
  /*
  * Get current lecture to resume course
  */
  async getCurrentLecture(ctx: Context) {
    const { user } = ctx.state
    const { courseId } = ctx.params
    if (!user) {
      return ctx.badRequest("There must be an user")
    }
    const student = await strapi.documents(STUDENT_COURSE_MODEL).findFirst(
      {
        filters: {
          student: { documentId: { $eq: user.documentId} },
          course: { documentId: { $eq: courseId } }
        },
        populate: {
          course: {
            populate: {
              modules: {
                populate: {
                  lectures: {
                    fields: ["documentId", "title", "description", "duration", "slug"],
                    populate: {
                      video: {
                        fields: ["id", "asset_id"]
                      }
                    }
                  }
                }
              }
            }
          },
          current_lecture: {
            fields: ["id", "documentId", "title", "slug"]
          }
        }
      }
    );
    if (!student) {
      return ctx.badRequest("No access to this course")
    }

    const lectures = student.course.modules.reduce((lectures, module) => {
      return lectures.concat(module.lectures)
    }, [])

    if (!lectures.length) {
      return ctx.badRequest("This course does not have any lecture")
    }

    const currentLecture = student.current_lecture || lectures[0]

    return {
      currentLecture
    }
  },
  /*
  * Resume course
  */
  async resumeCourse(ctx: Context) {
    const { user } = ctx.state
    const { courseId } = ctx.params
    if (!user) {
      return ctx.badRequest("There must be an user")
    }
    const student = await strapi.documents(STUDENT_COURSE_MODEL).findFirst(
      {
        filters: {
          student: { documentId: { $eq: user.documentId} },
          course: { documentId: { $eq: courseId } }
        },
        populate: {
          course: {
            populate: {
              modules: {
                populate: {
                  lectures: {
                    populate: {
                      video: {
                        fields: ["id", "asset_id", "playback_id"]
                      }
                    }
                  }
                }
              }
            }
          },
          lectures_completed: {
            fields: ["id"]
          },
          current_lecture: {
            fields: ["id"],
            populate: {
              video: {
                fields: ["asset_id", "playback_id"]
              }
            }
          }
        }
      }
    )
    if (!student) {
      return ctx.badRequest("No access to this course")
    }

    const lectures = student.course.modules.reduce((lectures, module) => {
      return lectures.concat(module.lectures)
    }, [])

    if (!lectures.length) {
      return ctx.badRequest("This course does not have any lecture")
    }

    const currentLecture = student.current_lecture || lectures[0]

    const signed = await strapi.service('plugin::mux-video-uploader.mux')
      .signPlaybackId(currentLecture.video.playback_id, "video");
    const playbackID = currentLecture.video.playback_id;

    return {
      PlayAuth: `https://stream.mux.com/${playbackID}.m3u8?token=${signed.token}`,
      VideoId: playbackID,
      classesCompleted: student.lectures_completed,
      currentLectureID: currentLecture.id
    }
  },
  /*
  * Get play auth for the given lecture
  */
  async getPlayAuth(ctx: Context) {
    const { user } = ctx.state
    if (!user) {
      return ctx.badRequest("There must be an user")
    }
    const { courseId } = ctx.params
    const { lecture } = ctx.query
    const student = await strapi.documents(STUDENT_COURSE_MODEL).findFirst(
      {
        filters: {
          student: { documentId: { $eq: user.documentId } },
          course: { documentId: { $eq: courseId } }
        },
        populate: {
          lectures_completed: {
            fields: ["id"]
          }
        }
      }
    )
    if (!student) {
      return ctx.badRequest("No access to this course")
    }

    const newCurrentLecture = await strapi.documents(LECTURE_MODEL).findFirst(
      {
        filters: { slug: { $eq: lecture } },
        populate: {
          video: {
            fields: ["asset_id", "playback_id"]
          }
        }
      }
    )
    if (!newCurrentLecture) {
      return ctx.badRequest("The lecture does not exist")
    }
    // Update student
    await strapi.documents(STUDENT_COURSE_MODEL).update({
      documentId: student.documentId,
      data: { current_lecture: newCurrentLecture.id } as any
    })

    const signed = await strapi.service('plugin::mux-video-uploader.mux')
      .signPlaybackId(newCurrentLecture.video.playback_id, "video");
    const playbackID = newCurrentLecture.video.playback_id;

    return {
      PlayAuth: `https://stream.mux.com/${playbackID}.m3u8?token=${signed.token}`,
      VideoId: newCurrentLecture.video.playback_id,
      classesCompleted: student.lectures_completed,
      currentLectureID: newCurrentLecture.id
    }
  },
  async checkLecture(ctx: Context) {
    const { user } = ctx.state
    const { courseId } = ctx.params
    const { lecture_id } = ctx.request.body;

    const student = await strapi.documents(STUDENT_COURSE_MODEL).findFirst(
      {
        filters: {
          student: { documentId: { $eq: user.documentId } },
          course: { documentId: { $eq: courseId } }
        },
        populate: {
          course: {
            populate: {
              modules: {
                populate: {
                  lectures: {
                    fields: ["id", "slug", "documentId"]
                  }
                }
              }
            }
          },
          lectures_completed: {
            fields: ["id", "slug", "documentId"]
          },
          current_lecture: {
            fields: ["id", "slug", "documentId"]
          }
        }
      }
    )
    if (!student) {
      return ctx.badRequest("No access to this course")
    }

    const rawLectures = student.course.modules.reduce((lectures, module) => {
      return lectures.concat(module.lectures)
    }, [])

    if (!rawLectures.length) {
      return ctx.badRequest("This course does not have any lectures")
    }

    const currentLectureIndex = rawLectures.findIndex(l => l.documentId === lecture_id)
    if (currentLectureIndex < 0 ) {
      return ctx.badRequest("The lecture does not exist or does not belong to this course")
    }

    let classesCompleted = student.lectures_completed
    if (!classesCompleted || !classesCompleted.length) {
      classesCompleted = [lecture_id]
    } else {
      // Check whether the lecture is already marked as completed
      // if so, remove it from the list
      const idx = classesCompleted.findIndex(l => l.documentId === lecture_id)
      if (idx < 0) {
        // The lecture is being marked as completed
        classesCompleted.push(lecture_id)
      }
    }

    // Set as current lecture the lecture that follows the one just marked as completed
    let newCurrentLecture = student.current_lecture
    if (currentLectureIndex !== rawLectures.length - 1) {
      // not the last lecture
      newCurrentLecture = rawLectures[currentLectureIndex + 1]
    } else {
      // is the last lecture
      newCurrentLecture = rawLectures[currentLectureIndex]
    }

    // Update student
    await strapi.documents(STUDENT_COURSE_MODEL).update(
      {
        documentId: student.documentId,
        data: {
          current_lecture: newCurrentLecture ? newCurrentLecture.id : null,
          lectures_completed: classesCompleted
        } as any
      }
    )
    ctx.body = {
      ok: true
    }
  },
  // this handler only returns the IDs of all the courses purchased by the user
  async getItemsPurchased(ctx: Context) {
    const { user } = ctx.state
    if (!user) {
      return ctx.badRequest("There must be an user")
    }

    const student = await strapi.documents("plugin::users-permissions.user").findOne({
      documentId: user.documentId,
      populate: {
        courses: {
          populate: {
            course: {
              fields: ["documentId"]
            }
          }
        }
      }
    })

    let res: any = student;
    if (!student) {
      res = {
        courses: []
      }
    }

    ctx.body = res
  },
  // this handler returns the full information of all the courses purchased by the user
  async getMyLearning(ctx) {
    const { user } = ctx.state
    if (!user) {
      return ctx.badRequest("There must be an user")
    }
    const student = await strapi.documents("plugin::users-permissions.user").findOne({
      documentId: user.documentId,
      fields: [],
      populate: {
        courses: {
          populate: {
            current_lecture: {
              fields: ['slug']
            },
            lectures_completed: {
              fields: ['slug']
            },
            course: {
              fields: [
                "documentId",
                "duration",
                "title",
                "description",
                "price",
                "slug"
              ],
              populate: {
                thumbnail: {
                  fields: ["documentId", "name", "url"]
                },
                modules: {
                  fields: ["documentId", "title", "duration"],
                  populate: {
                    lectures: {
                      fields: ["documentId", "title", "duration", "description"],
                    }
                  }
                },
                category: {
                  fields: ["documentId", "slug", "title"]
                }
              }
            }
          }
        }
      }
    })

    let res: any = student
    if (!student) {
      res = {
        courses: []
      }
    }

    ctx.body = res
  }
});

export default controller;
