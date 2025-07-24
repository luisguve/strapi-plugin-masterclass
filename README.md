# Strapi Plugin Masterclass

Transform your Strapi app into a Learning Management System to create and sell courses online effortlessly.

## Features

- Integrated with [strapi-plugin-mux-video-uploader](https://www.npmjs.com/package/strapi-plugin-mux-video-uploader)
- Organize courses in categories, modules and lectures
- Process payments with Stripe's checkout page

## Requirements

- Strapi V5.x.x
- Mux account
  - Access token ID
  - Secret Key
  - Webhook signing secret
  - Signing Key ID
  - Base64-encoded Private Key
- Stripe account
  - Secret key
  - Checkout success URL
  - Checkout cancel URL

## Installation

In the root of your strapi application, run the following command:

```
npm i strapi-plugin-masterclass
```

## Configuring .env variables

Once installed, set the following values in your project's .env:

```
ACCESS_TOKEN_ID={Access token ID}
ACCESS_TOKEN_SECRET={Secret key}
WEBHOOK_SIGNING_SECRET={Webhook signing secret}
SIGNING_KEY_ID={Signing Key ID}
SIGNING_KEY_PRIVATE_KEY={Base64-encoded Private Key}

STRIPE_SECRET_KEY={Secret key}
STRIPE_CHECKOUT_SUCCESS_URL={Checkout success URL}
STRIPE_CHECKOUT_CANCEL_URL={Checkout cancel URL}
```

## Setting up permissions

In order for the plugin to serve content, manage users and create and confirm orders, you must enable some endpoints in the Users & Permissions Pluginfor the Masterclass plugin.

For Authenticated users, enable the following:

From courses:

- checkLecture
- getClassesCompleted
- getCurrentLecture
- getCourseDetails
- getItemsPurchased
- getMyLearning
- getPlayAuth
- resumeCourse

From orders:

- confirmWithUser
- create
- find
- findOne

For Public users, enable the following:

From categories:

- findOne
- index

From courses:

- find
- findOne
- findSlugs

From orders:

- confirm
- create
- finishRegister

## Usage

Creating courses is done through the Strapi Admin Dashboard.

## API
The Masterclass plugin exposes a REST API for managing and consuming courses, categories, orders, and user progress. Below is a list of available endpoints, grouped by resource, with their methods, paths, authentication requirements, and descriptions.

---

### Categories

#### Get all categories
**GET** `/categories/index`  
**Auth:** Public  
Returns a list of all categories, each with its thumbnail and associated courses (with thumbnails and modules/lectures).

#### Get a single category
**GET** `/categories/:slug`  
**Auth:** Public  
Returns a single category by slug, including its thumbnail and courses (with thumbnails and modules/lectures).

---

### Courses

#### Get all courses
**GET** `/courses`  
**Auth:** Public  
Returns all courses with thumbnails, modules, lectures, category, students, and instructor info.

#### Get a single course
**GET** `/courses/:slug`  
**Auth:** Public  
Returns a course by slug, including modules, lectures, category, students, and instructor info.

#### Get all course slugs
**GET** `/courses-slugs`  
**Auth:** Public  
Returns a list of all course slugs.

#### Get course details (students & user progress)
**GET** `/course-details/:courseId`  
**Auth:** Authenticated  
Returns the number of students and, if authenticated, the classes the user has completed for a course.

#### Get classes completed by user
**GET** `/courses/:courseId/classes-completed`  
**Auth:** Authenticated  
Returns the lectures the user has completed for a course.

#### Get current lecture to resume
**GET** `/courses/:courseId/get-current-lecture`  
**Auth:** Authenticated  
Returns the current lecture for the user to resume in a course.

#### Resume course
**GET** `/courses/:courseId/resume-course`  
**Auth:** Authenticated  
Resumes the course for the user, returning the next lecture to watch.

#### Get play authorization for a lecture
**GET** `/courses/:courseId/get-play-auth-lecture`  
**Auth:** Authenticated  
Returns play authorization for a lecture video (e.g., Mux playback token).

#### Mark lecture as completed
**PUT** `/courses/:courseId/check-lecture`  
**Auth:** Authenticated  
Marks a lecture as completed for the user.

#### Get purchased course IDs
**GET** `/my-items-purchased`  
**Auth:** Authenticated  
Returns the IDs of all courses purchased by the user.

#### Get purchased courses (full info)
**GET** `/my-learning`  
**Auth:** Authenticated  
Returns full information for all courses purchased by the user.

---

### Orders

#### List orders
**GET** `/orders`  
**Auth:** Authenticated  
Returns all orders for the authenticated user.

#### Get a single order
**GET** `/orders/:id`  
**Auth:** Authenticated  
Returns a single order by ID, only if it belongs to the user.

#### Create an order
**POST** `/orders`  
**Auth:** Public or Authenticated  
Creates a new order for one or more courses. Requires `courses` (array of course IDs), `payment_method` (`credit_card` or `paypal`), and optionally `email` (for guest checkout). Returns a checkout session for Stripe or PayPal.

#### Confirm an order (public)
**PUT** `/orders/confirm`  
**Auth:** Public  
Confirms an order after payment (Stripe/PayPal webhook or redirect). Marks the order as confirmed and enrolls the user in the purchased courses.

#### Confirm an order with user
**PUT** `/orders/confirm-with-user`  
**Auth:** Authenticated  
Confirms an order for the authenticated user after payment. Enrolls the user in the purchased courses.

#### Finish registration after order
**PUT** `/orders/finish-register`  
**Auth:** Public  
Completes registration for a user after a guest checkout and order confirmation.

---

## Services

The plugin provides internal services for advanced usage and extension:

- **courses**: Register users to courses, calculate lecture durations, etc.
- **payments**: Handles order creation and payment confirmation for Stripe and PayPal.
- **stripe**: Integrates with Stripe for checkout sessions and payment status.
- **paypal**: Integrates with PayPal for checkout sessions and payment status.

---

## Data Models

The plugin defines the following main content-types:

- **Category**: title, description, thumbnail, slug, courses
- **Course**: title, duration, description, price, thumbnail, long_description, difficulty, language, category, slug, students, modules, instructor
- **Module**: title, duration, course, lectures, slug, description
- **Lecture**: title, slug, duration, video, module, description
- **StudentCourse**: course, student, current_lecture, lectures_completed
- **Order**: amount, user, confirmed, checkout_session, payment_method, items, response, courses
- **Instructor**: name, bio, image, slug, designation, courses

See the `server/src/content-types/` directory for full schema details.

## Bug reports

If you find a bug or need support for using this plugin, open an issue at https://github.com/luisguve/strapi-plugin-masterclass
