import { env } from "../../config/env.js";
import { AppError } from "../../errors/app-error.js";

export type SslCommerzResponse = {
  status?: string;
  failedreason?: string;
  sessionkey?: string;
  GatewayPageURL?: string;
  tran_id?: string;
  val_id?: string;
  amount?: string;
  currency?: string;
  bank_tran_id?: string;
  card_type?: string;
  risk_level?: string | number;
  risk_title?: string;
  [key: string]: unknown;
};

const getGatewayBaseUrl = () => {
  return env.SSLCOMMERZ_IS_LIVE
    ? "https://securepay.sslcommerz.com"
    : "https://sandbox.sslcommerz.com";
};

const parseResponse = async (
  response: Response,
): Promise<SslCommerzResponse> => {
  const text = await response.text();

  let result: SslCommerzResponse;

  try {
    result = JSON.parse(text) as SslCommerzResponse;
  } catch {
    throw new AppError(
      502,
      "SSLCommerz returned an invalid response",
      {
        code: "INVALID_PAYMENT_GATEWAY_RESPONSE",
      },
    );
  }

  if (!response.ok) {
    throw new AppError(
      502,
      "Could not communicate with SSLCommerz",
      {
        code: "PAYMENT_GATEWAY_REQUEST_FAILED",
        gatewayStatus: response.status,
      },
    );
  }

  return result;
};

export const initiateSslCommerzPayment = async (
  data: Record<string, string>,
) => {
  const response = await fetch(
    `${getGatewayBaseUrl()}/gwprocess/v4/api.php`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(data),
      signal: AbortSignal.timeout(30000),
    },
  );

  return parseResponse(response);
};

export const validateSslCommerzPayment = async (
  validationId: string,
) => {
  const url = new URL(
    `${getGatewayBaseUrl()}/validator/api/validationserverAPI.php`,
  );

  url.searchParams.set("val_id", validationId);
  url.searchParams.set("store_id", env.SSLCOMMERZ_STORE_ID);
  url.searchParams.set(
    "store_passwd",
    env.SSLCOMMERZ_STORE_PASSWORD,
  );
  url.searchParams.set("v", "1");
  url.searchParams.set("format", "json");

  const response = await fetch(url, {
    method: "GET",
    signal: AbortSignal.timeout(30000),
  });

  return parseResponse(response);
};