import { useState } from "react";
import { apiFetch, codificarSk } from "../api/client";
import { useFetch } from "../hooks/useFetch";
import { ahoraLocal, hace, hoy, ordenarPor } from "../utils/fechas";
import Notice from "../components/Notice";

const CAMPOS = [
  ["temperatura", "Temperatura (°C)"],
  ["humedad", "Humedad (%)"],
  ["presion_atmosferica", "Presión (hPa)"],
  ["velocidad_viento", "Viento (km/h)"],
  ["precipitacion", "Lluvia (mm)"],
];

export default function Mediciones() {
  const [sel, setSel] = useState("");
  const [desde, setDesde] = useState(() => hace(30));
  const [hasta, setHasta] = useState(() => hoy());
  const [filtro, setFiltro] = useState(() => ({ desde: hace(30), hasta: hoy() }));
  const [version, setVersion] = useState(0);
  const [editando, setEditando] = useState(null); // { nuevo, timestamp, fila }
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const ubs = useFetch("/catalogo/ubicaciones");
  const lista = ubs.data || [];
  const id = sel || lista[0]?.id_ubicacion || "";

  // "hasta" incluye todo el día: se completa con la hora final.
  const path = id
    ? `/mediciones/${id}?desde=${filtro.desde}&hasta=${filtro.hasta}T23:59:59`
    : null;
  const med = useFetch(path, version);
  const filas = ordenarPor(med.data, "timestamp");

  async function guardar(e) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    const body = {};
    for (const [name] of CAMPOS) {
      const v = f.get(name);
      if (v !== "") body[name] = Number(v);
    }
    try {
      if (editando.nuevo) {
        body.id_ubicacion = Number(id);
        body.timestamp = f.get("timestamp");
        await apiFetch("/mediciones", { method: "POST", body });
      } else {
        await apiFetch(`/mediciones/${id}/${codificarSk(editando.timestamp)}`, {
          method: "PUT",
          body,
        });
      }
      setEditando(null);
      setAviso("Medición guardada.");
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err.message);
    }
  }

  async function eliminar(m) {
    if (!window.confirm("¿Eliminar esta medición?")) return;
    setError("");
    try {
      await apiFetch(`/mediciones/${id}/${codificarSk(m.timestamp)}`, { method: "DELETE" });
      setAviso("Medición eliminada.");
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="cabecera">
        <h1>Mediciones</h1>
        <button
          className="btn"
          disabled={!id}
          onClick={() => {
            setAviso("");
            setError("");
            setEditando({ nuevo: true, timestamp: ahoraLocal(), fila: {} });
          }}
        >
          Nueva medición
        </button>
      </div>

      <form
        className="card row filtros"
        onSubmit={(e) => {
          e.preventDefault();
          setFiltro({ desde, hasta });
        }}
      >
        <div className="campo f">
          <label htmlFor="ub">Ubicación</label>
          <select id="ub" value={id} onChange={(e) => setSel(e.target.value)}>
            {lista.map((u) => (
              <option key={u.id_ubicacion} value={u.id_ubicacion}>
                {u.ciudad}, {u.estado}
              </option>
            ))}
          </select>
        </div>
        <div className="campo f">
          <label htmlFor="desde">Desde</label>
          <input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="campo f">
          <label htmlFor="hasta">Hasta</label>
          <input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <button className="btn2">Consultar</button>
      </form>

      <Notice tipo="ok">{aviso}</Notice>
      <Notice>{error || ubs.error || med.error}</Notice>

      <div className="row">
        <div className="card grow2 tabla-wrap">
          {med.loading ? (
            <p className="mu">Cargando…</p>
          ) : !filas.length ? (
            <p className="mu">No hay mediciones en este rango. Cambia las fechas o agrega una nueva.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  {CAMPOS.map(([n, l]) => (
                    <th key={n}>{l}</th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {filas.map((m) => (
                  <tr key={m.timestamp}>
                    <td>{m.timestamp.replace("T", " ")}</td>
                    {CAMPOS.map(([n]) => (
                      <td key={n}>{m[n] ?? "—"}</td>
                    ))}
                    <td className="acciones">
                      <button
                        className="link"
                        onClick={() => {
                          setAviso("");
                          setEditando({ nuevo: false, timestamp: m.timestamp, fila: m });
                        }}
                      >
                        Editar
                      </button>
                      <button className="link peligro" onClick={() => eliminar(m)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {editando && (
          <form key={editando.timestamp} className="card grow1 formulario" onSubmit={guardar}>
            <h2>{editando.nuevo ? "Nueva medición" : "Editar medición"}</h2>
            <div className="campo">
              <label htmlFor="timestamp">Fecha y hora</label>
              <input
                id="timestamp"
                name="timestamp"
                type="datetime-local"
                defaultValue={editando.timestamp}
                disabled={!editando.nuevo}
                required
              />
            </div>
            {CAMPOS.map(([n, l]) => (
              <div className="campo" key={n}>
                <label htmlFor={n}>{l}</label>
                <input id={n} name={n} type="number" step="any" defaultValue={editando.fila[n] ?? ""} />
              </div>
            ))}
            <div className="row">
              <button className="btn">Guardar</button>
              <button type="button" className="btn2" onClick={() => setEditando(null)}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
