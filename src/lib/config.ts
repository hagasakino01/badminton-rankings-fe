const rawApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:4000/api";
const normalizedApiUrl = rawApiUrl.replace(/\/+$/, "");

export const API_URL = normalizedApiUrl.endsWith("/api")
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api`;
