'use strict';

const { JWT } = require('@mux/mux-node');

module.exports = {
  async find(ctx) {
    let courses = await strapi.entityService.findMany("plugin::masterclass.mc-course", {
      filters: {},
      populate: {
        thumbnail: {
          fields: ["name", "url"]
        },
        modules: {
          fields: ["title", "lectures_order", "duration"],
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
    })
    courses = await Promise.all(courses.map(async c => {
      if (c.category) {
        c.category.slug = await strapi.service("plugin::masterclass.courses").buildAbsoluteSlug(c)
      }

      const modulesOrdered = strapi.service("plugin::masterclass.courses").orderModules(c)

      c.modules = modulesOrdered

      return c
    }))
    return { courses }
  },
  async findOne(ctx) {
    const { slug } = ctx.params
    const course = await strapi.db.query("plugin::masterclass.mc-course").findOne({
      where: { slug },
      select: [
        "id",
        "duration",
        "title",
        "description",
        "long_description",
        "price",
        "modules_order",
        "slug"
      ],
      populate: {
        thumbnail: {
          select: ["name", "url"]
        },
        modules: {
          select: ["title", "lectures_order", "duration"],
          populate: {
            lectures: {
              select: ["title"],
              populate: {
                video: {
                  select: ["duration"]
                }
              }
            }
          }
        },
        category: {
          select: ["slug", "title", "id"]
        }
      }
    })
    if (course) {
      if (course.category) {
        course.category.slug =
        await strapi.service("plugin::masterclass.courses").buildAbsoluteSlug(course)
      }

      const modulesOrdered = strapi.service("plugin::masterclass.courses").orderModules(course)

      course.modules = modulesOrdered
    }
    return course
  },
  async findSlugs(ctx) {
    const courses = await strapi.entityService.findMany("plugin::masterclass.mc-course", {
      filters: {},
      fields: ["slug"]
    })
    return { courses }
  },
  /*
  * Get the classes the user (if any) has marked as seen and the number of students
  */
  async getCourseDetails(ctx) {
    const { user } = ctx.state
    const { id } = ctx.params
    let classesCompleted = []
    if (user) {
      // Get user progress
      const student = await strapi.db.query(
        "plugin::masterclass.mc-student-course"
      ).findOne(
        {
          where: {
            student: {user: user.id},
            course: id
          },
          populate: {
            lectures_seen: {
              select: ["id"]
            }
          }
        }
      )
      if (student) {
        classesCompleted = student.lectures_seen
      }
    }
    const students = await strapi.db.query("plugin::masterclass.mc-student-course").count({
      where: {
        course: { id }
      }
    })

    return {
      classesCompleted,
      students
    }
  },
  /*
  * Get user progress
  */
  async getClassesCompleted(ctx) {
    const { user } = ctx.state
    const { id } = ctx.params
    if (!user) {
      return ctx.badRequest("There must be an user")
    }
    const student = await strapi.db.query(
      "plugin::masterclass.mc-student-course"
    ).findOne(
      {
        where: {
          student: {user: user.id},
          course: id
        },
        populate: {
          lectures_seen: {
            select: ["id"]
          }
        }
      }
    )
    if (!student) {
      return ctx.badRequest("No access to this course")
    }
    return {
      classesCompleted: student.lectures_seen
    }
  },
  /*
  * Resume course
  */
  async resumeCourse(ctx) {
    const { user } = ctx.state
    const { id } = ctx.params
    if (!user) {
      return ctx.badRequest("There must be an user")
    }
    const student = await strapi.db.query(
      "plugin::masterclass.mc-student-course"
    ).findOne(
      {
        where: {
          student: {user: user.id},
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
                        select: ["id", "video_id"]
                      }
                    }
                  }
                }
              }
            }
          },
          lectures_seen: {
            select: ["id"]
          },
          current_lecture: {
            select: ["id"],
            populate: {
              video: {
                select: ["video_id"]
              }
            }
          }
        }
      }
    )
    if (!student) {
      return ctx.badRequest("No access to this course")
    }

    const modulesOrdered = strapi.service("plugin::masterclass.courses").orderModules(student.course)

    const lectures = modulesOrdered.reduce((lectures, module) => {
      return lectures.concat(module.lectures)
    }, [])

    if (!lectures.length) {
      return ctx.badRequest("This course does not have any lecture")
    }

    const currentLecture = student.current_lecture || lectures[0]

    const config = await strapi.service('plugin::masterclass.upload').getConfig()
    const {
      mux_signing_key_id,
      mux_signing_private_key
    } = config

    if (!mux_signing_key_id || !mux_signing_private_key) {
      console.log("Config is not valid", config)
      return ctx.internalServerError("Config is not valid")
    }

    let baseOptions = {
      keyId: mux_signing_key_id,
      keySecret: mux_signing_private_key,
      expiration: "6h"
    };

    const playbackID = currentLecture.video.video_id

    const token = JWT.sign(playbackID, { ...baseOptions, type: 'video'});

    return {
      PlayAuth: `https://stream.mux.com/${playbackID}.m3u8?token=${token}`,
      VideoId: currentLecture.video.video_id,
      classesCompleted: student.lectures_seen,
      currentLectureID: currentLecture.id
    }
  },
  /*
  * Get play auth for the given lecture
  */
  async getPlayAuth(ctx) {
    const { user } = ctx.state
    if (!user) {
      return ctx.badRequest("There must be an user")
    }
    const { id } = ctx.params
    const { lecture } = ctx.query
    const student = await strapi.db.query(
      "plugin::masterclass.mc-student-course"
    ).findOne(
      {
        where: {
          student: {user: user.id},
          course: id
        },
        populate: {
          lectures_seen: {
            select: ["id"]
          }
        }
      }
    )
    if (!student) {
      return ctx.badRequest("No access to this course")
    }

    const newCurrentLecture = await strapi.db.query(
      "plugin::masterclass.mc-lecture"
    ).findOne(
      {
        where: {
          id: lecture
        },
        populate: {
          video: {
            select: ["video_id"]
          }
        }
      }
    )
    if (!newCurrentLecture) {
      return ctx.badRequest("The lecture does not exist")
    }
    // Update student
    await strapi.entityService.update(
      "plugin::masterclass.mc-student-course",
      student.id,
      {
        data: {
          current_lecture: newCurrentLecture.id
        }
      }
    )

    const config = await strapi.service('plugin::masterclass.upload').getConfig()
    const {
      mux_signing_key_id,
      mux_signing_private_key
    } = config

    if (!mux_signing_key_id || !mux_signing_private_key) {
      console.log("Config is not valid", config)
      return ctx.internalServerError("Config is not valid")
    }

    let baseOptions = {
      keyId: mux_signing_key_id,
      keySecret: mux_signing_private_key,
      expiration: "6h"
    };

    const playbackID = newCurrentLecture.video.video_id

    const token = JWT.sign(playbackID, { ...baseOptions, type: 'video'});

    return {
      PlayAuth: `https://stream.mux.com/${playbackID}.m3u8?token=${token}`,
      VideoId: newCurrentLecture.video.video_id,
      classesCompleted: student.lectures_seen,
      currentLectureID: newCurrentLecture.id
    }
  },
  async checkLecture(ctx) {
    const { user } = ctx.state
    const { id } = ctx.params
    const { lecture } = ctx.query

    const student = await strapi.db.query(
      "plugin::masterclass.mc-student-course"
    ).findOne(
      {
        where: {
          student: {user: user.id},
          course: id
        },
        populate: {
          course: {
            populate: {
              modules: {
                populate: {
                  lectures: {
                    select: ["id"]
                  }
                }
              }
            }
          },
          lectures_seen: {
            select: ["id"]
          },
          current_lecture: {
            select: ["id"]
          }
        }
      }
    )
    if (!student) {
      return ctx.badRequest("No access to this course")
    }

    const modulesOrdered =
      strapi.service("plugin::masterclass.courses").orderModules(student.course)

    // student.course.lectures = lecturesOrdered

    const rawLectures = modulesOrdered.reduce((lectures, module) => {
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
    await strapi.entityService.update(
      "plugin::masterclass.mc-student-course",
      student.id,
      {
        data: {
          currentLecture: newCurrentLecture ? newCurrentLecture.id : null,
          lectures_seen: classesCompleted
        }
      }
    )
    return {
      ok: true
    }
  },
  // this handler only returns the IDs of all the courses purchased by the user
  async getItemsPurchased(ctx) {
    const { user } = ctx.state
    if (!user) {
      return ctx.badRequest("There must be an user")
    }

    const student = await strapi.db.query("plugin::masterclass.mc-student").findOne({
      where: {
        user: user.id
      },
      populate: {
        courses: {
          populate: {
            course: {
              select: ["id"]
            }
          }
        }
      }
    })

    let res = student
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
    const student = await strapi.db.query("plugin::masterclass.mc-student").findOne({
      where: {
        user: user.id
      },
      populate: {
        courses: {
          populate: {
            course: {
              select: [
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
                  select: ["name", "url"]
                },
                modules: {
                  select: ["title", "duration", "lectures_order"],
                  populate: {
                    lectures: {
                      select: ["title"],
                      populate: {
                        video: {
                          select: ["duration"]
                        }
                      }
                    }
                  }
                },
                category: {
                  select: ["slug", "title", "id"]
                }
              }
            }
          }
        }
      }
    })

    let res = student
    if (!student) {
      res = {
        courses: []
      }
    }
    res.courses = await Promise.all(res.courses.map(async ({course: c}) => {
      c.kind = "course"
      if (c.category) {
        c.category.slug = await strapi.service("plugin::masterclass.courses").buildAbsoluteSlug(c)
      }

      const modulesOrdered = strapi.service("plugin::masterclass.courses").orderModules(c)

      c.modules = modulesOrdered
      return c
    }))

    ctx.body = res
  }
}
