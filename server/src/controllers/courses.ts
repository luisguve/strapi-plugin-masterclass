import type { Core } from '@strapi/strapi';
import { Context } from 'koa';
import { COURSE_MODEL, STUDENT_COURSE_MODEL, LECTURE_MODEL } from '../utils/types';

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: Context) {
    let courses = await strapi.documents(COURSE_MODEL).findMany({
      populate: {
        thumbnail: {
          fields: ["name", "url"]
        },
        modules: {
          fields: ["title", "duration"],
          populate: {
            lectures: {
              fields: ["title"],
              populate: {
                video: {
                  fields: ["duration"]
                }
              }
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
          fields: ["title", "duration"],
          populate: {
            lectures: {
              fields: ["title"],
              populate: {
                video: {
                  fields: ["duration"]
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
    const { id } = ctx.params
    let classesCompleted = []
    if (user) {
      // Get user progress
      const student = await strapi.documents(STUDENT_COURSE_MODEL).findFirst(
        {
          filters: {
            student: user.id,
            course: id
          },
          populate: {
            lectures_seen: {
              fields: ["id"]
            }
          }
        }
      )
      if (student) {
        classesCompleted = student.lectures_seen
      }
    }
    const students = await strapi.documents(STUDENT_COURSE_MODEL).count({
      filters: {
        course: id
      }
    })
    ctx.body = { classesCompleted, students }
  },
  /*
  * Get user progress
  */
  async getClassesCompleted(ctx: Context) {
    const { user } = ctx.state
    const { id } = ctx.params
    if (!user) {
      return ctx.badRequest("There must be an user")
    }
    const student = await strapi.documents(STUDENT_COURSE_MODEL).findFirst(
      {
        filters: {
          student: user.id,
          course: id
        },
        populate: {
          lectures_seen: {
            fields: ["id"]
          }
        }
      }
    )
    if (!student) {
      return ctx.badRequest("No access to this course")
    }
    ctx.body = { classesCompleted: student.lectures_seen }
  },
  /*
  * Resume course
  */
  async resumeCourse(ctx: Context) {
    const { user } = ctx.state
    const { id } = ctx.params
    if (!user) {
      return ctx.badRequest("There must be an user")
    }
    const student = await strapi.documents(STUDENT_COURSE_MODEL).findFirst(
      {
        filters: {
          student: user.id,
          course: id
        },
        populate: {
          course: {
            populate: {
              modules: {
                populate: {
                  lectures: {
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
          lectures_seen: {
            fields: ["id"]
          },
          current_lecture: {
            fields: ["id"],
            populate: {
              video: {
                fields: ["asset_id"]
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

    const token = await strapi.service('plugin::strapi-plugin-mux-video-uploader.mux')
      .signPlaybackId(currentLecture.video.asset_id, "video");
    const playbackID = currentLecture.video.asset_id;

    return {
      PlayAuth: `https://stream.mux.com/${playbackID}.m3u8?token=${token}`,
      VideoId: playbackID,
      classesCompleted: student.lectures_seen,
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
    const { id } = ctx.params
    const { lecture } = ctx.query
    const student = await strapi.documents(STUDENT_COURSE_MODEL).findFirst(
      {
        filters: {
          student: user.id,
          course: id
        },
        populate: {
          lectures_seen: {
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
        filters: {
          id: lecture
        },
        populate: {
          video: {
            fields: ["asset_id"]
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

    const token = await strapi.service('plugin::strapi-plugin-mux-video-uploader.mux')
      .signPlaybackId(newCurrentLecture.video.asset_id, "video");
    const playbackID = newCurrentLecture.video.asset_id;

    return {
      PlayAuth: `https://stream.mux.com/${playbackID}.m3u8?token=${token}`,
      VideoId: newCurrentLecture.video.asset_id,
      classesCompleted: student.lectures_seen,
      currentLectureID: newCurrentLecture.id
    }
  },
  async checkLecture(ctx: Context) {
    const { user } = ctx.state
    const { id } = ctx.params
    const { lecture } = ctx.query

    const student = await strapi.documents(STUDENT_COURSE_MODEL).findFirst(
      {
        filters: {
          student: {user: user.id},
          course: id
        },
        populate: {
          course: {
            populate: {
              modules: {
                populate: {
                  lectures: {
                    fields: ["id"]
                  }
                }
              }
            }
          },
          lectures_seen: {
            fields: ["id"]
          },
          current_lecture: {
            fields: ["id"]
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

    const currentLectureIndex = rawLectures.findIndex(
      l => l.id.toString() === lecture
    )
    if (currentLectureIndex < 0 ) {
      return ctx.badRequest("The lecture does not exist or does not belong to this course")
    }

    let updateCurrentLecture = true
    let classesCompleted = student.lectures_seen
    if (!classesCompleted || !classesCompleted.length) {
      classesCompleted = [lecture]
    } else {
      // Check whether the lecture is already marked as completed
      // if so, remove it from the list
      const idx = classesCompleted.findIndex(l => l.id.toString() === lecture)
      if (idx < 0) {
        // The lecture is being marked as completed
        classesCompleted.push(lecture)
      } else {
        // The lecture is being unmarked as completed
        const firstHalf = classesCompleted.slice(0, idx)
        const secondHalf = classesCompleted.slice(idx + 1)
        classesCompleted = firstHalf.concat(secondHalf)
        // Don't update the current lecture
        updateCurrentLecture = false
      }
    }

    // Set as current lecture the lecture that follows the one just marked as seen
    let newCurrentLecture = student.current_lecture
    if (updateCurrentLecture) {
      if (currentLectureIndex !== rawLectures.length - 1) {
        // not the last lecture
        newCurrentLecture = rawLectures[currentLectureIndex + 1]
      } else {
        // is the last lecture
        newCurrentLecture = rawLectures[currentLectureIndex]
      }
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
              fields: ["id"]
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
      populate: {
        courses: {
          populate: {
            course: {
              fields: [
                "id",
                "duration",
                "title",
                "description",
                "modules_order",
                "price",
                "slug"
              ],
              populate: {
                thumbnail: {
                  fields: ["name", "url"]
                },
                modules: {
                  fields: ["title", "duration"],
                  populate: {
                    lectures: {
                      fields: ["title"],
                      populate: {
                        video: {
                          fields: ["duration"]
                        }
                      }
                    }
                  }
                },
                category: {
                  fields: ["slug", "title", "id"]
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
