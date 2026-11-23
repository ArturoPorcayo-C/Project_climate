const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// El token vive solo en memoria: se pierde al recargar o cerrar la pestaña.
let token = "";
let alRechazarToken = () => {};

export function setToken(valor) {
  token = valor;
}

export function onTokenRechazado(fn) {
  alRechazarToken = fn;
}

export class ApiError extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.status = status;
  }
}

// DynamoDB usa claves como "2026#44": el "#" debe ir codificado en la URL.
export const codificarSk = (sk) => String(sk).replace(/#/g, "%23");

export async function apiFetch(path, { method = "GET", body } = {}) {
  if (!BASE) {
    throw new ApiError("Falta VITE_API_URL en el archivo .env", 0);
  }

  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      "No se pudo conectar con el servidor. Revisa la URL de la API y la configuración de CORS.",
      0,
    );
  }

  if (res.status === 401 || res.status === 403) {
    alRechazarToken();
    throw new ApiError("El token no es válido o no tiene acceso.", res.status);
  }

  const texto = await res.text();
  let datos = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = null;
  }

  if (!res.ok) {
    throw new ApiError(datos?.error || `Error ${res.status}`, res.status);
  }
  return datos;
}
