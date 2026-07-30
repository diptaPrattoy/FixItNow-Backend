import { mkdir, writeFile } from "node:fs/promises";

type AuthType =
  | "none"
  | "customer"
  | "technician"
  | "admin";

type RequestOptions = {
  name: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  auth?: AuthType;
  body?: Record<string, unknown>;
  tests?: string[];
};

const bearerAuth = (auth: AuthType) => {
  if (auth === "none") {
    return {
      type: "noauth",
    };
  }

  return {
    type: "bearer",
    bearer: [
      {
        key: "token",
        value: `{{${auth}Token}}`,
        type: "string",
      },
    ],
  };
};

const request = ({
  name,
  method,
  path,
  auth = "none",
  body,
  tests,
}: RequestOptions) => {
  return {
    name,
    request: {
      method,
      header: body
        ? [
            {
              key: "Content-Type",
              value: "application/json",
              type: "text",
            },
          ]
        : [],
      auth: bearerAuth(auth),
      url: `{{baseUrl}}${path}`,
      ...(body && {
        body: {
          mode: "raw",
          raw: JSON.stringify(body, null, 2),
          options: {
            raw: {
              language: "json",
            },
          },
        },
      }),
    },
    ...(tests && {
      event: [
        {
          listen: "test",
          script: {
            type: "text/javascript",
            exec: tests,
          },
        },
      ],
    }),
  };
};

const saveToken = (variable: string) => [
  "const response = pm.response.json();",
  `pm.collectionVariables.set("${variable}", response.data.accessToken);`,
];

const collection = {
  info: {
    name: "FixItNow Backend API",
    description:
      "Postman collection for the FixItNow home service platform.",
    schema:
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },

  variable: [
    {
      key: "baseUrl",
      value: "https://fixitnow-qemf.onrender.com",
    },
    {
      key: "customerToken",
      value: "",
    },
    {
      key: "technicianToken",
      value: "",
    },
    {
      key: "adminToken",
      value: "",
    },
    {
      key: "customerEmail",
      value: "dipta.customer@example.com",
    },
    {
      key: "customerPassword",
      value: "Customer123",
    },
    {
      key: "technicianEmail",
      value: "rahim.technician@example.com",
    },
    {
      key: "technicianPassword",
      value: "Technician123",
    },
    {
      key: "adminEmail",
      value: "admin@fixitnow.com",
    },
    {
      key: "adminPassword",
      value: "replace-with-admin-password",
    },
    {
      key: "userId",
      value: "",
    },
    {
      key: "categoryId",
      value: "",
    },
    {
      key: "technicianId",
      value: "",
    },
    {
      key: "serviceId",
      value: "",
    },
    {
      key: "availabilityId",
      value: "",
    },
    {
      key: "bookingId",
      value: "",
    },
    {
      key: "paymentId",
      value: "",
    },
  ],

  item: [
    {
      name: "Health",
      item: [
        request({
          name: "Root",
          method: "GET",
          path: "/",
        }),
        request({
          name: "API Health",
          method: "GET",
          path: "/api/health",
        }),
        request({
          name: "Database Health",
          method: "GET",
          path: "/api/health/database",
        }),
      ],
    },

    {
      name: "Authentication",
      item: [
        request({
          name: "Register Customer",
          method: "POST",
          path: "/api/auth/register",
          body: {
            name: "Customer User",
            email: "customer@example.com",
            password: "Customer123",
            phone: "+8801712345678",
            role: "CUSTOMER",
          },
        }),

        request({
          name: "Register Technician",
          method: "POST",
          path: "/api/auth/register",
          body: {
            name: "Technician User",
            email: "technician@example.com",
            password: "Technician123",
            phone: "+8801812345678",
            role: "TECHNICIAN",
            location: "Dhaka",
          },
        }),

        request({
          name: "Customer Login",
          method: "POST",
          path: "/api/auth/login",
          body: {
            email: "{{customerEmail}}",
            password: "{{customerPassword}}",
          },
          tests: saveToken("customerToken"),
        }),

        request({
          name: "Technician Login",
          method: "POST",
          path: "/api/auth/login",
          body: {
            email: "{{technicianEmail}}",
            password: "{{technicianPassword}}",
          },
          tests: saveToken("technicianToken"),
        }),

        request({
          name: "Admin Login",
          method: "POST",
          path: "/api/auth/login",
          body: {
            email: "{{adminEmail}}",
            password: "{{adminPassword}}",
          },
          tests: saveToken("adminToken"),
        }),

        request({
          name: "Current User",
          method: "GET",
          path: "/api/auth/me",
          auth: "customer",
        }),
      ],
    },

    {
      name: "Public Discovery",
      item: [
        request({
          name: "List Categories",
          method: "GET",
          path: "/api/categories",
        }),

        request({
          name: "List Services",
          method: "GET",
          path: "/api/services?page=1&limit=10",
        }),

        request({
          name: "Filter Services",
          method: "GET",
          path: "/api/services?category=electrical&location=Dhaka&sortBy=price_asc",
        }),

        request({
          name: "List Technicians",
          method: "GET",
          path: "/api/technicians?page=1&limit=10",
        }),

        request({
          name: "Technician Details",
          method: "GET",
          path: "/api/technicians/{{technicianId}}",
        }),
      ],
    },

    {
      name: "Technician",
      item: [
        request({
          name: "Get Profile",
          method: "GET",
          path: "/api/technician/profile",
          auth: "technician",
        }),

        request({
          name: "Update Profile",
          method: "PUT",
          path: "/api/technician/profile",
          auth: "technician",
          body: {
            bio: "Experienced home service technician.",
            experienceYears: 5,
            location: "Dhaka",
          },
        }),

        request({
          name: "List Services",
          method: "GET",
          path: "/api/technician/services",
          auth: "technician",
        }),

        request({
          name: "Create Service",
          method: "POST",
          path: "/api/technician/services",
          auth: "technician",
          body: {
            categoryId: "{{categoryId}}",
            name: "Home Electrical Repair",
            description: "Residential electrical repair service.",
            price: 1000,
            durationMinutes: 120,
          },
        }),

        request({
          name: "Update Service",
          method: "PATCH",
          path: "/api/technician/services/{{serviceId}}",
          auth: "technician",
          body: {
            price: 1200,
          },
        }),

        request({
          name: "Deactivate Service",
          method: "DELETE",
          path: "/api/technician/services/{{serviceId}}",
          auth: "technician",
        }),

        request({
          name: "List Availability",
          method: "GET",
          path: "/api/technician/availability?page=1&limit=20",
          auth: "technician",
        }),

        request({
          name: "Create Availability",
          method: "POST",
          path: "/api/technician/availability",
          auth: "technician",
          body: {
            startTime: "2026-08-10T10:00:00+06:00",
            endTime: "2026-08-10T12:00:00+06:00",
            status: "AVAILABLE",
          },
        }),

        request({
          name: "Update Availability",
          method: "PATCH",
          path: "/api/technician/availability/{{availabilityId}}",
          auth: "technician",
          body: {
            status: "AVAILABLE",
          },
        }),

        request({
          name: "Delete Availability",
          method: "DELETE",
          path: "/api/technician/availability/{{availabilityId}}",
          auth: "technician",
        }),
      ],
    },

    {
      name: "Bookings",
      item: [
        request({
          name: "Create Booking",
          method: "POST",
          path: "/api/bookings",
          auth: "customer",
          body: {
            serviceId: "{{serviceId}}",
            availabilitySlotId: "{{availabilityId}}",
            address: "House 12, Road 5, Dhaka",
            notes: "Please call before arriving.",
          },
        }),

        request({
          name: "Customer Bookings",
          method: "GET",
          path: "/api/bookings?page=1&limit=10",
          auth: "customer",
        }),

        request({
          name: "Customer Booking Details",
          method: "GET",
          path: "/api/bookings/{{bookingId}}",
          auth: "customer",
        }),

        request({
          name: "Cancel Booking",
          method: "PATCH",
          path: "/api/bookings/{{bookingId}}/cancel",
          auth: "customer",
          body: {
            reason: "My schedule has changed.",
          },
        }),

        request({
          name: "Technician Bookings",
          method: "GET",
          path: "/api/technician/bookings?page=1&limit=10",
          auth: "technician",
        }),

        request({
          name: "Technician Booking Details",
          method: "GET",
          path: "/api/technician/bookings/{{bookingId}}",
          auth: "technician",
        }),

        request({
          name: "Update Booking Status",
          method: "PATCH",
          path: "/api/technician/bookings/{{bookingId}}",
          auth: "technician",
          body: {
            status: "ACCEPTED",
          },
        }),
      ],
    },

    {
      name: "Payments",
      item: [
        request({
          name: "Create Payment Session",
          method: "POST",
          path: "/api/payments/create",
          auth: "customer",
          body: {
            bookingId: "{{bookingId}}",
            city: "Dhaka",
            postcode: "1216",
          },
        }),

        request({
          name: "Payment History",
          method: "GET",
          path: "/api/payments?page=1&limit=10",
          auth: "customer",
        }),

        request({
          name: "Payment Details",
          method: "GET",
          path: "/api/payments/{{paymentId}}",
          auth: "customer",
        }),

        request({
          name: "Success Callback",
          method: "POST",
          path: "/api/payments/success",
          body: {
            tran_id: "SSLCommerz-provided-transaction-id",
            val_id: "SSLCommerz-provided-validation-id",
          },
        }),

        request({
          name: "Failure Callback",
          method: "POST",
          path: "/api/payments/fail",
          body: {
            tran_id: "SSLCommerz-provided-transaction-id",
          },
        }),

        request({
          name: "Cancellation Callback",
          method: "POST",
          path: "/api/payments/cancel",
          body: {
            tran_id: "SSLCommerz-provided-transaction-id",
          },
        }),
      ],
    },

    {
      name: "Reviews",
      item: [
        request({
          name: "Create Review",
          method: "POST",
          path: "/api/reviews",
          auth: "customer",
          body: {
            bookingId: "{{bookingId}}",
            rating: 5,
            comment: "The technician completed the job professionally.",
          },
        }),
      ],
    },

    {
      name: "Admin",
      item: [
        request({
          name: "List Users",
          method: "GET",
          path: "/api/admin/users?page=1&limit=10",
          auth: "admin",
        }),

        request({
          name: "Ban User",
          method: "PATCH",
          path: "/api/admin/users/{{userId}}",
          auth: "admin",
          body: {
            status: "BANNED",
          },
        }),

        request({
          name: "Unban User",
          method: "PATCH",
          path: "/api/admin/users/{{userId}}",
          auth: "admin",
          body: {
            status: "ACTIVE",
          },
        }),

        request({
          name: "All Bookings",
          method: "GET",
          path: "/api/admin/bookings?page=1&limit=10",
          auth: "admin",
        }),

        request({
          name: "Admin Categories",
          method: "GET",
          path: "/api/admin/categories",
          auth: "admin",
        }),

        request({
          name: "Create Category",
          method: "POST",
          path: "/api/admin/categories",
          auth: "admin",
          body: {
            name: "Carpentry",
            description: "Furniture and wood repair services.",
          },
        }),

        request({
          name: "Update Category",
          method: "PATCH",
          path: "/api/admin/categories/{{categoryId}}",
          auth: "admin",
          body: {
            description: "Updated category description.",
            isActive: true,
          },
        }),
      ],
    },
  ],
};

await mkdir("docs", {
  recursive: true,
});

await writeFile(
  "docs/FixItNow.postman_collection.json",
  JSON.stringify(collection, null, 2),
  "utf8",
);

console.log(
  "Created docs/FixItNow.postman_collection.json",
);