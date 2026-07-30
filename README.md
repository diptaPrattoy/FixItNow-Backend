# FixItNow Backend API

FixItNow is a RESTful backend API for a home service marketplace where customers can discover technicians, book services, complete payments, track jobs, and submit reviews.

## Live API

https://fixitnow-qemf.onrender.com

## Technology Stack

- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- Neon
- JSON Web Token
- Zod
- bcryptjs
- SSLCommerz
- Postman
- Render

## User Roles

### Customer

- Register and log in
- Browse categories, services, and technicians
- Filter services by category, location, price, and rating
- Book available technician time slots
- Cancel eligible bookings
- Complete payments through SSLCommerz
- View payment history and payment status
- Track booking progress
- Review completed services

### Technician

- Register and log in
- Update technician profile
- Create and manage services
- Create and manage availability slots
- View incoming bookings
- Accept or decline bookings
- Start paid jobs
- Mark jobs as completed

### Admin

- Log in using the seeded administrator account
- View customers, technicians, and administrators
- Ban and unban users
- View all platform bookings
- Create and update service categories
- Activate and deactivate categories

## Booking Workflow

```text
REQUESTED
   ├── ACCEPTED → PAID → IN_PROGRESS → COMPLETED
   ├── DECLINED
   └── CANCELLED
```

Customers can cancel requested or accepted bookings. Paid bookings require a verified refund process before cancellation.

## Payment Flow

1. A technician accepts a booking.
2. The customer creates an SSLCommerz payment session.
3. The API returns the SSLCommerz gateway URL.
4. The customer completes payment through the hosted gateway page.
5. SSLCommerz sends a callback and IPN notification.
6. The API validates the transaction through SSLCommerz.
7. The payment status becomes `COMPLETED`.
8. The booking status becomes `PAID`.

## Error Response Format

All API errors follow a consistent structure:

```json
{
  "success": false,
  "message": "Readable error message",
  "errorDetails": {
    "code": "ERROR_CODE"
  }
}
```

Validation errors include field-specific information:

```json
{
  "success": false,
  "message": "Validation failed",
  "errorDetails": [
    {
      "field": "body.email",
      "message": "Enter a valid email address"
    }
  ]
}
```

## Local Installation

Clone the repository:

```bash
git clone https://github.com/diptaPrattoy/FixItNow-Backend.git
cd FixItNow-Backend
```

Install the dependencies:

```bash
npm install
```

Create a `.env` file using `.env.example`:

```env
NODE_ENV=development
PORT=5000

DATABASE_URL=YOUR_NEON_POOLED_DATABASE_URL
DIRECT_URL=YOUR_NEON_DIRECT_DATABASE_URL

JWT_SECRET=YOUR_LONG_RANDOM_JWT_SECRET
JWT_EXPIRES_IN=604800

ADMIN_NAME=FixItNow Admin
ADMIN_EMAIL=admin@fixitnow.com
ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD

APP_BASE_URL=YOUR_PUBLIC_API_OR_TUNNEL_URL

SSLCOMMERZ_STORE_ID=YOUR_SANDBOX_STORE_ID
SSLCOMMERZ_STORE_PASSWORD=YOUR_SANDBOX_STORE_PASSWORD
SSLCOMMERZ_IS_LIVE=false
```

For SSLCommerz testing, `APP_BASE_URL` must be publicly accessible. Use the deployed API URL or a public tunnel URL because SSLCommerz cannot send callbacks to `localhost`.

Generate Prisma Client:

```bash
npm run prisma:generate
```

Apply the database migrations:

```bash
npm run db:deploy
```

Seed the administrator account and initial service categories:

```bash
npm run db:seed
```

Start the development server:

```bash
npm run dev
```

The local API will be available at:

```text
http://localhost:5000
```

## Available Scripts

```bash
npm run dev
npm run typecheck
npm run build
npm start

npm run prisma:generate
npm run prisma:validate
npm run prisma:format
npm run prisma:studio

npm run db:migrate
npm run db:deploy
npm run db:status
npm run db:seed

npm run docs:postman
```

## Main API Endpoints

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### Public Discovery

```text
GET /api/categories
GET /api/services
GET /api/technicians
GET /api/technicians/:id
```

### Customer Bookings

```text
POST  /api/bookings
GET   /api/bookings
GET   /api/bookings/:id
PATCH /api/bookings/:id/cancel
```

### Technician Management

```text
GET    /api/technician/profile
PUT    /api/technician/profile

GET    /api/technician/services
POST   /api/technician/services
PATCH  /api/technician/services/:id
DELETE /api/technician/services/:id

GET    /api/technician/availability
POST   /api/technician/availability
PATCH  /api/technician/availability/:id
DELETE /api/technician/availability/:id
```

### Technician Bookings

```text
GET   /api/technician/bookings
GET   /api/technician/bookings/:id
PATCH /api/technician/bookings/:id
```

### Payments

```text
POST /api/payments/create
GET  /api/payments
GET  /api/payments/:id

POST /api/payments/success
POST /api/payments/fail
POST /api/payments/cancel
POST /api/payments/ipn
```

### Reviews

```text
POST /api/reviews
```

### Admin

```text
GET   /api/admin/users
PATCH /api/admin/users/:id

GET /api/admin/bookings

GET   /api/admin/categories
POST  /api/admin/categories
PATCH /api/admin/categories/:id
```

## API Documentation

The Postman collection is available in the repository:

[Download the FixItNow Postman collection](./docs/FixItNow.postman_collection.json)

Published Postman documentation:

```text
ADD_PUBLISHED_POSTMAN_DOCUMENTATION_URL
```

## Administrator Credentials

```text
Email: admin@fixitnow.com
Password: Provided privately in the assignment submission
```

The administrator password is intentionally excluded from the public repository. It should be submitted privately through the assignment submission form or included in the private evaluator instructions.

## Deployment

The API is deployed on Render and uses Neon PostgreSQL.

### Render Configuration

```text
Build Command: npm ci && npm run build
Start Command: npm start
Health Check Path: /api/health
```

Use the following pre-deploy command when supported:

```text
npm run db:deploy
```

All production environment variables are configured through the Render dashboard.

## Security Practices

- Passwords are hashed using bcrypt.
- Authentication is handled using signed JWT access tokens.
- Requests are validated using Zod.
- Banned users are blocked from authenticated endpoints.
- Payment transactions are validated through SSLCommerz before being marked as completed.
- Environment variables and credentials are excluded from version control.
- Admin registration is not publicly available.

## Project Structure

```text
prisma/
├── migrations/
├── schema.prisma
└── seed.ts

src/
├── config/
├── errors/
├── lib/
├── middlewares/
├── modules/
│   ├── admin/
│   ├── auth/
│   ├── booking/
│   ├── payment/
│   ├── public/
│   ├── review/
│   └── technician/
├── types/
├── utils/
├── app.ts
└── server.ts
```

## Project Documentation

- Prisma schema: `prisma/schema.prisma`
- Database migrations: `prisma/migrations`
- Database seed: `prisma/seed.ts`
- Postman collection: `docs/FixItNow.postman_collection.json`
- Environment example: `.env.example`

## Author

**Dipta Prattoy Karmakar**

- GitHub: [diptaPrattoy](https://github.com/diptaPrattoy)
