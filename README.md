# Strapi Plugin Masterclass

Transform your Strapi app into a Learning Management System to create and sell courses online effortlessly.

## Features

- Integrated with [strapi-plugin-mux-video-uploader](https://www.npmjs.com/package/strapi-plugin-mux-video-uploader)
- Organize courses in categories, modules and lectures
- Process payments with Stripe's checkout page

## Requirements

- Strapi V5.x.x
- Mux account
- - Access token ID
- - Secret Key
- - Webhook signing secret
- - Signing Key ID
- - Base64-encoded Private Key
- Stripe account
- - Secret key
- - Checkout success URL
- - Checkout cancel URL

## Installation

In the root of your strapi application, run the following command:

```
npm i strapi-plugin-masterclass
```

## Configuring .env variables

Once installed, set the following values in your project's .env:

ACCESS_TOKEN_ID={Access token ID}
ACCESS_TOKEN_SECRET={Secret key}
WEBHOOK_SIGNING_SECRET={Webhook signing secret}
SIGNING_KEY_ID={Signing Key ID}
SIGNING_KEY_PRIVATE_KEY={Base64-encoded Private Key}

STRIPE_SECRET_KEY={Secret key}
STRIPE_CHECKOUT_SUCCESS_URL={Checkout success URL}
STRIPE_CHECKOUT_CANCEL_URL={Checkout cancel URL}

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

## Bug reports

If you find a bug or need support for using this plugin, open an issue at https://github.com/luisguve/strapi-plugin-masterclass
