const API_BASE_URL = "https://itx-frontend-test.onrender.com/api";

export class ApiError extends Error {
  constructor(status) {
    super(`API request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (!response.ok) {
    throw new ApiError(response.status);
  }

  return response.json();
}

export function getProducts() {
  return request("/product");
}

export function getProductById(id) {
  return request(`/product/${encodeURIComponent(id)}`);
}

export function addProductToCart({ id, colorCode, storageCode }) {
  return request("/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, colorCode, storageCode }),
  });
}
