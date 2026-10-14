function aLocal(d) {
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString();
}

// "2026-10-14T10:30" (hora local, formato del campo datetime-local)
export const ahoraLocal = () => aLocal(new Date()).slice(0, 16);

// "2026-10-14"
export const hoy = () => aLocal(new Date()).slice(0, 10);

export function hace(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return aLocal(d).slice(0, 10);
}

export const ordenarPor = (lista, campo) =>
  [...(lista || [])].sort((a, b) => String(a[campo]).localeCompare(String(b[campo])));

export const anioActual = () => new Date().getFullYear();
