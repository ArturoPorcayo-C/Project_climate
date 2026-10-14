import { useState } from "react";
import { apiFetch, codificarSk } from "../api/client";
import { useFetch } from "../hooks/useFetch";
import { anioActual, ordenarPor } from "../utils/fechas";
import Notice from "../components/Notice";

export default function Predicciones() {
  const [sel, setSel] = useState("");
  const [version, setVersion] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const [anio] = useState(anioActual);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const ubs = useFetch("/catalogo/ubicaciones");
  const usrs = useFetch("/catalogo/usuarios");
  const ubicaciones = ubs.data || [];
  const usuarios = usrs.data || [];
  const id = sel || ubicaciones[0]?.id_ubicacion || "";

  const pred = useFetch(id ? `/predicciones/${id}` : null, version);
  const filas = ordenarPor(pred.data, "id_semana_objetivo").reverse();

  async function guardar(e) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    const body = {
      id_ubicacion: Number(id),
      id_semana_objetivo: `${f.get("anio")}#${f.get("semana")}`,
      temp_promedio_predicha: Number(f.get("temp")),
      probabilidad_lluvia: Number(f.get("lluvia")) / 100,
      algoritmo_utilizado: f.get("algoritmo"),
      fecha_generacion: new Date().toISOString().slice(0, 19),
      id_usuario: Number(f.get("usuario")),
    };
    try {
      await apiFetch("/predicciones", { method: "POST", body });
      setAbierto(false);
      setAviso("Predicción guardada.");
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err.message);
    }
  }

  async function eliminar(p) {
    if (!window.confirm("¿Eliminar esta predicción?")) return;
    setError("");
    try {
      await apiFetch(`/predicciones/${id}/${codificarSk(p.id_semana_objetivo)}`, {
        method: "DELETE",
      });
      setAviso("Predicción eliminada.");
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="cabecera">
        <h1>Predicciones</h1>
        <button
          className="btn"
          disabled={!id}
          onClick={() => {
            setAviso("");
            setError("");
            setAbierto(true);
          }}
        >
          Nueva predicción
        </button>
      </div>

      <div className="card campo selector-ancho">
        <label htmlFor="ub">Ubicación</label>
        <select id="ub" value={id} onChange={(e) => setSel(e.target.value)}>
          {ubicaciones.map((u) => (
            <option key={u.id_ubicacion} value={u.id_ubicacion}>
              {u.ciudad}, {u.estado}
            </option>
          ))}
        </select>
      </div>

      <Notice tipo="ok">{aviso}</Notice>
      <Notice>{error || ubs.error || usrs.error || pred.error}</Notice>

      <div className="row">
        <div className="card grow2 tabla-wrap">
          {pred.loading ? (
            <p className="mu">Cargando…</p>
          ) : !filas.length ? (
            <p className="mu">No hay predicciones para esta ubicación.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Semana (año · número)</th>
                  <th>Temp. promedio °C</th>
                  <th>Prob. lluvia</th>
                  <th>Algoritmo</th>
                  <th>Generada</th>
                  <th>Usuario</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filas.map((p) => (
                  <tr key={p.id_semana_objetivo}>
                    <td>{p.id_semana_objetivo.replace("#", " · ")}</td>
                    <td>{p.temp_promedio_predicha}</td>
                    <td>{Math.round(p.probabilidad_lluvia * 100)} %</td>
                    <td>{p.algoritmo_utilizado}</td>
                    <td>{String(p.fecha_generacion).replace("T", " ")}</td>
                    <td>{usuarios.find((u) => u.id_usuario === p.id_usuario)?.nombre ?? p.id_usuario}</td>
                    <td className="acciones">
                      <button className="link peligro" onClick={() => eliminar(p)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {abierto && (
          <form className="card grow1 formulario" onSubmit={guardar}>
            <h2>Nueva predicción</h2>
            <div className="row">
              <div className="campo f">
                <label htmlFor="anio">Año</label>
                <input id="anio" name="anio" type="number" defaultValue={anio} required />
              </div>
              <div className="campo f">
                <label htmlFor="semana">Semana</label>
                <input id="semana" name="semana" type="number" min="1" max="53" required />
              </div>
            </div>
            <div className="campo">
              <label htmlFor="temp">Temp. promedio predicha (°C)</label>
              <input id="temp" name="temp" type="number" step="any" required />
            </div>
            <div className="campo">
              <label htmlFor="lluvia">Probabilidad de lluvia (%)</label>
              <input id="lluvia" name="lluvia" type="number" min="0" max="100" step="any" required />
            </div>
            <div className="campo">
              <label htmlFor="algoritmo">Algoritmo utilizado</label>
              <input id="algoritmo" name="algoritmo" defaultValue="manual" required />
            </div>
            <div className="campo">
              <label htmlFor="usuario">Generada por</label>
              <select id="usuario" name="usuario" required>
                {usuarios.map((u) => (
                  <option key={u.id_usuario} value={u.id_usuario}>
                    {u.nombre}
                  </option>
                ))}
              </select>
            </div>
            <span className="mu">La semana debe existir en Catálogo › Semanas.</span>
            <div className="row">
              <button className="btn">Guardar</button>
              <button type="button" className="btn2" onClick={() => setAbierto(false)}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
