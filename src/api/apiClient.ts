const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type TokenGetter = () => string | null;
type RequestHook = () => void;
type UnauthorizedHook = (payload: ApiPayload | null) => void;

let getToken: TokenGetter = () => null;
let onUnauthorized: UnauthorizedHook = () => {};
let onRequestStart: RequestHook = () => {};
let onRequestEnd: RequestHook = () => {};

interface ApiErrorOptions {
  status?: number;
  code?: string;
  details?: unknown;
}

interface ApiPayload {
  message?: string | string[];
  code?: string;
  [key: string]: unknown;
}

type RequestMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: RequestMethod;
  data?: unknown;
  auth?: boolean;
  headers?: HeadersInit;
  showBackdrop?: boolean;
}

interface ConfigureApiClientOptions {
  getTokenFn?: TokenGetter;
  onUnauthorizedFn?: UnauthorizedHook;
  onRequestStartFn?: RequestHook;
  onRequestEndFn?: RequestHook;
}

export class ApiError extends Error {
  status?: number;
  code?: string;
  details?: unknown;

  constructor(message: string, { status, code, details }: ApiErrorOptions = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function configureApiClient({
  getTokenFn,
  onUnauthorizedFn,
  onRequestStartFn,
  onRequestEndFn
}: ConfigureApiClientOptions): void {
  if (typeof getTokenFn === "function") getToken = getTokenFn;
  if (typeof onUnauthorizedFn === "function") onUnauthorized = onUnauthorizedFn;
  if (typeof onRequestStartFn === "function") onRequestStart = onRequestStartFn;
  if (typeof onRequestEndFn === "function") onRequestEnd = onRequestEndFn;
}

function extractMessage(payload: ApiPayload | null, fallback: string): string {
  if (!payload) return fallback;
  if (Array.isArray(payload.message)) return payload.message.join(". ");
  if (typeof payload.message === "string") return payload.message;
  return fallback;
}

function isExpiredToken(payload: ApiPayload | null): boolean {
  const message = String(payload?.message ?? "").toLowerCase();
  return payload?.code === "TOKEN_EXPIRED" || (message.includes("token") && message.includes("expir"));
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", data, auth = true, headers = {}, showBackdrop = true } = options;
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;

  if (showBackdrop) onRequestStart();

  try {
    const token = auth ? getToken() : null;
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers
      },
      body:
        data !== undefined ? (isFormData ? data : JSON.stringify(data)) : undefined
    });

    const raw = await response.text();
    let payload: ApiPayload | null = null;

    if (raw) {
      try {
        payload = JSON.parse(raw) as ApiPayload;
      } catch {
        payload = { message: raw };
      }
    }

    if (!response.ok) {
      if (response.status === 401 && auth && isExpiredToken(payload)) {
        onUnauthorized(payload);
      }

      throw new ApiError(extractMessage(payload, "Error inesperado en la API"), {
        status: response.status,
        code: payload?.code,
        details: payload
      });
    }

    return payload as T;
  } finally {
    if (showBackdrop) onRequestEnd();
  }
}

export const apiClient = {
  get<T>(path: string, options?: Omit<RequestOptions, "method">): Promise<T> {
    return request<T>(path, { ...options, method: "GET" });
  },
  post<T>(path: string, data?: unknown, options?: Omit<RequestOptions, "method" | "data">): Promise<T> {
    return request<T>(path, { ...options, method: "POST", data });
  },
  patch<T>(path: string, data?: unknown, options?: Omit<RequestOptions, "method" | "data">): Promise<T> {
    return request<T>(path, { ...options, method: "PATCH", data });
  },
  delete<T>(path: string, options?: Omit<RequestOptions, "method">): Promise<T> {
    return request<T>(path, { ...options, method: "DELETE" });
  }
};
