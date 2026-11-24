
import { useState } from "react";
import { apiFetch, codificarSk } from "../api/client";
import { useFetch } from "../hooks/useFetch";
import { ordenarPor } from "../utils/fechas";
import Notice from "../components/Notice";

// Obtiene el año y número de semana ISO actuales.
function semanaActualISO() {
  const fecha = new Date();

  const d = new Date(Date.UTC(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate()
  ));

  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));

  const inicio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));

  return {
    anio: d.getUTCFullYear(),
    semana: Math.ceil(
      (((d - inicio) / 86400000) + 1) / 7
    ),
  };
}

export default function Predicciones() {
  const [sel, setSel] = useState("");
  const [version, setVersion] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState("automatico");
  const [semanaSel, setSemanaSel] = useState("");
  const [usuarioSel, setUsuarioSel] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const ubs = useFetch("/catalogo/ubicaciones");
  const usrs = useFetch("/catalogo/usuarios");
  const sems = useFetch("/calendario/semanas");

  const ubicaciones = ubs.data || [];
  const usuarios = usrs.data || [];
  const semanas = sems.data || [];

  const id = sel || ubicaciones[0]?.id_ubicacion || "";

  const pred = useFetch(
    id ? `/predicciones/${id}` : null,
    version
  );

  const filas = ordenarPor(
    pred.data,
    "id_semana_objetivo"
  ).reverse();

  // Semanas que ya tienen predicción para esta ubicación.
  const ocupadas = new Set(
    filas.map((p) => p.id_semana_objetivo)
  );

  // Semanas disponibles para generación manual.
  const disponibles = semanas
    .filter((s) => {
      const clave = `${s.anio}#${s.numero_semana}`;
      return !ocupadas.has(clave);
    })
    .sort((a, b) =>
      a.anio - b.anio ||
      a.numero_semana - b.numero_semana
    );

  // Primera semana futura sin predicción.
  const actual = semanaActualISO();

  const siguienteSemana = disponibles.find((s) =>
    s.anio > actual.anio ||
    (
      s.anio === actual.anio &&
      s.numero_semana > actual.semana
    )
  );

  async function generar(anio, semana) {
    setError("");
    setAviso("");
    setProcesando(true);

    try {
      const idUsuario = Number(
        usuarioSel || usuarios[0]?.id_usuario
      );

      if (!idUsuario) {
        throw new Error("No hay usuarios disponibles.");
      }

      const resultado = await apiFetch(
        "/generar-prediccion",
        {
          method: "POST",
          body: {
            id_ubicacion: Number(id),
            anio: Number(anio),
            semana: Number(semana),
            id_usuario: idUsuario,
          },
        }
      );

      setAbierto(false);
      setAviso(
        `Predicción generada correctamente para la semana ${semana} de ${anio}.`
      );

      setVersion((v) => v + 1);

    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  async function generarAutomaticamente() {
    if (!siguienteSemana) {
      setError(
        "No hay semanas futuras disponibles en el catálogo. Registra primero una semana futura."
      );
      return;
    }

    await generar(
      siguienteSemana.anio,
      siguienteSemana.numero_semana
    );
  }

  async function generarManual(e) {
    e.preventDefault();

    if (!semanaSel) {
      setError("Selecciona una semana.");
      return;
    }

    const [anio, semana] = semanaSel.split("#");

    await generar(anio, semana);
  }

  async function eliminar(p) {
    if (!window.confirm("¿Eliminar esta predicción?")) {
      return;
    }

    setError("");
    setAviso("");

    try {
      await apiFetch(
        `/predicciones/${id}/${codificarSk(
          p.id_semana_objetivo
        )}`,
        { method: "DELETE" }
      );

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
          disabled={!id || procesando}
          onClick={() => {
            setError("");
            setAviso("");
            setModo("automatico");
            setAbierto(true);
          }}
        >
          Nueva predicción
        </button>
      </div>

      <div className="card campo selector-ancho">
        <label htmlFor="ub">Ubicación</label>

        <select
          id="ub"
          value={id}
          onChange={(e) => {
            setSel(e.target.value);
            setError("");
            setAviso("");
          }}
        >
          {ubicaciones.map((u) => (
            <option
              key={u.id_ubicacion}
              value={u.id_ubicacion}
            >
              {u.ciudad}, {u.estado}
            </option>
          ))}
        </select>
      </div>

      <Notice tipo="ok">{aviso}</Notice>
      <Notice>
        {error || ubs.error || usrs.error ||
          sems.error || pred.error}
      </Notice>

      <div className="row">
        <div className="card grow2 tabla-wrap">
          {pred.loading ? (
            <p className="mu">Cargando…</p>
          ) : !filas.length ? (
            <p className="mu">
              No hay predicciones para esta ubicación.
            </p>
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
                    <td>
                      {p.id_semana_objetivo.replace(
                        "#", " · "
                      )}
                    </td>

                    <td>{p.temp_promedio_predicha}</td>

                    <td>
                      {Math.round(
                        p.probabilidad_lluvia * 100
                      )} %
                    </td>

                    <td>{p.algoritmo_utilizado}</td>

                    <td>
                      {String(p.fecha_generacion).replace(
                        "T", " "
                      )}
                    </td>

                    <td>
                      {usuarios.find(
                        (u) =>
                          u.id_usuario === p.id_usuario
                      )?.nombre ?? p.id_usuario}
                    </td>

                    <td className="acciones">
                      <button
                        className="link peligro"
                        onClick={() => eliminar(p)}
                      >
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
          <div className="card grow1 formulario">
            <h2>Nueva predicción</h2>

            <div className="row">
              <button
                type="button"
                className={
                  modo === "automatico" ? "btn" : "btn2"
                }
                onClick={() => {
                  setModo("automatico");
                  setError("");
                }}
              >
                Automática
              </button>

              <button
                type="button"
                className={
                  modo === "manual" ? "btn" : "btn2"
                }
                onClick={() => {
                  setModo("manual");
                  setError("");
                }}
              >
                Manual
              </button>
            </div>

            {modo === "automatico" ? (
              <>
                <h3>Generación automática</h3>

                <p>
                  El sistema buscará la siguiente semana
                  futura disponible que todavía no tenga
                  predicción para esta ubicación.
                </p>

                {siguienteSemana ? (
                  <div className="campo">
                    <label>Semana objetivo</label>
                    <p>
                      {siguienteSemana.anio} ·{" "}
                      {siguienteSemana.numero_semana}
                    </p>
                  </div>
                ) : (
                  <p className="mu">
                    No hay semanas futuras disponibles
                    en el catálogo.
                  </p>
                )}

                <button
                  className="btn"
                  disabled={
                    procesando ||
                    !siguienteSemana ||
                    pred.loading
                  }
                  onClick={generarAutomaticamente}
                >
                  {procesando
                    ? "Generando..."
                    : "Generar automáticamente"}
                </button>
              </>
            ) : (
              <form onSubmit={generarManual}>
                <h3>Selección manual</h3>

                <div className="campo">
                  <label htmlFor="semana">
                    Semana objetivo
                  </label>

                  <select
                    id="semana"
                    value={semanaSel}
                    onChange={(e) =>
                      setSemanaSel(e.target.value)
                    }
                    required
                  >
                    <option value="">
                      Seleccionar semana
                    </option>

                    {disponibles.map((s) => (
                      <option
                        key={`${s.anio}#${s.numero_semana}`}
                        value={`${s.anio}#${s.numero_semana}`}
                      >
                        {s.anio} · Semana {s.numero_semana}
                      </option>
                    ))}
                  </select>
                </div>

                {!disponibles.length && (
                  <p className="mu">
                    No hay semanas disponibles para esta
                    ubicación.
                  </p>
                )}

                <button
                  className="btn"
                  disabled={
                    procesando ||
                    !disponibles.length ||
                    pred.loading
                  }
                >
                  {procesando
                    ? "Generando..."
                    : "Generar predicción"}
                </button>
              </form>
            )}

            <div className="campo">
              <label htmlFor="usuario">
                Generada por
              </label>

              <select
                id="usuario"
                value={
                  usuarioSel ||
                  usuarios[0]?.id_usuario || ""
                }
                onChange={(e) =>
                  setUsuarioSel(e.target.value)
                }
              >
                {usuarios.map((u) => (
                  <option
                    key={u.id_usuario}
                    value={u.id_usuario}
                  >
                    {u.nombre}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn2"
              disabled={procesando}
              onClick={() => setAbierto(false)}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </>
  );
}
