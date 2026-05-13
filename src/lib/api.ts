import { API_URL } from "./config";
import {
  beginAppRequest,
  endAppRequest,
  showApiErrorModal,
} from "./app-feedback";

type ApiOptions = RequestInit & {
  token?: string;
  showGlobalLoading?: boolean;
  showErrorModal?: boolean;
  errorTitle?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}) {
  const {
    token,
    showGlobalLoading = true,
    showErrorModal = true,
    errorTitle,
    ...requestOptions
  } = options;
  const headers = new Headers(requestOptions.headers);

  if (!headers.has("Content-Type") && requestOptions.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const shouldTrackRequest = typeof window !== "undefined" && showGlobalLoading;

  if (shouldTrackRequest) {
    beginAppRequest();
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...requestOptions,
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      const error = new ApiError(errorBody?.message ?? "Request failed", response.status);

      if (showErrorModal) {
        showApiErrorModal(error.message, errorTitle);
      }

      throw error;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (
      showErrorModal &&
      !(error instanceof ApiError) &&
      !(error instanceof DOMException && error.name === "AbortError")
    ) {
      showApiErrorModal(
        error instanceof Error ? error.message : "Có lỗi xảy ra khi gọi API.",
        errorTitle,
      );
    }

    throw error;
  } finally {
    if (shouldTrackRequest) {
      endAppRequest();
    }
  }
}
