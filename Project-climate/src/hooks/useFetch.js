import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

// path = null no hace petición. Cambiar "version" fuerza recargar.
export function useFetch(path, version = 0) {
  const key = path ? `${path}#${version}` : null;
  const [res, setRes] = useState({ key: null, data: null, error: "" });

  useEffect(() => {
    if (!key) return;
    let activo = true;
    apiFetch(path).then(
      (data) => activo && setRes({ key, data, error: "" }),
      (e) => activo && setRes({ key, data: null, error: e.message }),
    );
    return () => {
      activo = false;
    };
  }, [key, path]);

  const listo = key !== null && res.key === key;
  return {
    data: listo ? res.data : null,
    error: listo ? res.error : "",
    loading: key !== null && !listo,
  };
}
