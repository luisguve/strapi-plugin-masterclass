import mcCategory from './mc-category/schema.json';
import mcCourse from './mc-course/schema.json';
import mcLecture from './mc-lecture/schema.json';
import mcModule from './mc-module/schema.json';
import mcStudentCourse from './mc-student-course/schema.json';
import mcOrder from './mc-order/schema.json';
import mcInstructor from './mc-instructor/schema.json';

export default {
  'mc-category': { schema: mcCategory },
  'mc-course': { schema: mcCourse },
  'mc-lecture': { schema: mcLecture },
  'mc-module': { schema: mcModule },
  'mc-student-course': { schema: mcStudentCourse },
  'mc-order': { schema: mcOrder },
  'mc-instructor': { schema: mcInstructor }
};
