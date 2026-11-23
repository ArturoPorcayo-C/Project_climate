import { useState } from "react";
import { useFetch } from "../hooks/useFetch";
import { hace, ordenarPor } from "../utils/fechas";
import Notice from "../components/Notice";

const fmt = (v, unidad) => (v === undefined || v === null ? "—" : `${v} ${unidad}`);

export default function Panel() {
  const [sel, setSel] = useState("");
  const [desde] = useState(() => hace(7));
  const ubs = useFetch("/catalogo/ubicaciones");
  const lista = ubs.data || [];
  const id = sel || lista[0]?.id_ubicacion || "";

  const med = useFetch(id ? `/mediciones/${id}?desde=${desde}` : null);
  const pred = useFetch(id ? `/predicciones/${id}` : null);

  const mediciones = ordenarPor(med.data, "timestamp");
  const ultima = mediciones.at(-1);
  const puntos = mediciones.slice(-12).filter((m) => m.temperatura !== undefined);
  const maxT = Math.max(1, ...puntos.map((m) => m.temperatura));
  const prediccion = ordenarPor(pred.data, "id_semana_objetivo").at(-1);

  return (
    <>
      <div className="cabecera">
        <h1>Panel</h1>
        <div className="selector">
          <label htmlFor="ub">Ubicación</label>
          <select id="ub" value={id} onChange={(e) => setSel(e.target.value)}>
            {lista.map((u) => (
              <option key={u.id_ubicacion} value={u.id_ubicacion}>
                {u.ciudad}, {u.estado}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Notice>{ubs.error || med.error || pred.error}</Notice>

      {!ubs.loading && !lista.length ? (
        <p className="card mu">Aún no hay ubicaciones. Crea la primera en Catálogo.</p>
      ) : (
        <>
          <div className="row">
            <div className="card k"><small>Temperatura</small><strong>{fmt(ultima?.temperatura, "°C")}</strong></div>
            <div className="card k"><small>Humedad</small><strong>{fmt(ultima?.humedad, "%")}</strong></div>
            <div className="card k"><small>Viento</small><strong>{fmt(ultima?.velocidad_viento, "km/h")}</strong></div>
            <div className="card k"><small>Presión</small><strong>{fmt(ultima?.presion_atmosferica, "hPa")}</strong></div>
          </div>
          <div className="row">
            <div className="card grow2">
              <h2>Temperatura de las últimas mediciones</h2>
              {puntos.length ? (
                <div className="bars">
                  {puntos.map((m) => (
                    <div
                      key={m.timestamp}
                      title={m.timestamp}
                      style={{ height: `${Math.max(10, (m.temperatura / maxT) * 100)}%` }}
                    >
                      {Math.round(m.temperatura)}°
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mu">No hay mediciones en los últimos 7 días.</p>
              )}
            </div>
            <div className="card grow1">
              <h2>Última predicción</h2>
              {prediccion ? (
                <>
                  <strong className="grande">{prediccion.temp_promedio_predicha} °C</strong>
                  <p className="mu">
                    Semana {prediccion.id_semana_objetivo.replace("#", " · ")}. Lluvia:{" "}
                    {Math.round(prediccion.probabilidad_lluvia * 100)} %
                  </p>
                  <span className="tag">{prediccion.algoritmo_utilizado}</span>
                </>
              ) : (
                <p className="mu">Aún no hay predicciones para esta ubicación.</p>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
