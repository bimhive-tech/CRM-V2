const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail =
      data?.detail ||
      data?.email?.[0] ||
      data?.password?.[0] ||
      data?.name?.[0] ||
      "Request failed.";
    throw new Error(detail);
  }

  return data;
}
