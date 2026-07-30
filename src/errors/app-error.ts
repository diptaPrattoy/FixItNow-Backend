export class AppError extends Error {
  readonly statusCode: number;
  readonly errorDetails: unknown;

  constructor(
    statusCode: number,
    message: string,
    errorDetails: unknown = null,
  ) {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.errorDetails = errorDetails;

    Error.captureStackTrace(this, this.constructor);
  }
}