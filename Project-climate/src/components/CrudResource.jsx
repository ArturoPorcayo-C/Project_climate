import { useState } from "react";
import { apiFetch } from "../api/client";
import { useFetch } from "../hooks/useFetch";
import Notice from "./Notice";

const mostrar = (campo, valor) =>
  campo.type === "checkbox" ? (valor ? "Sí" : "No") : (valor ?? "");

export default function CrudResource({ cfg }) {
  const [version, setVersion] = useState(0);
  const [editando, setEditando] = useState(null); // { id, fila } (id null = nuevo)
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const { data, error: errorCarga, loading } = useFetch(cfg.base, version);

  async function guardar(e) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    const body = {};
    for (const c of cfg.campos) {
      if (c.type === "checkbox") body[c.name] = f.get(c.name) === "on";
      else if (c.type === "number") body[c.name] = Number(f.get(c.name));
      else body[c.name] = f.get(c.name);
    }
    try {
      if (editando.id) {
        await apiFetch(`${cfg.base}/${editando.id}`, { method: "PUT", body });
      } else {
        await apiFetch(cfg.base, { method: "POST", body });
      }
      setEditando(null);
      setAviso("Cambios guardados.");
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err.message);
    }
  }

  async function eliminar(fila) {
    if (!window.confirm(`¿Eliminar esta ${cfg.singular}?`)) return;
    setError("");
    try {
      await apiFetch(`${cfg.base}/${fila[cfg.pk]}`, { method: "DELETE" });
      setAviso("Registro eliminado.");
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err.message);
    }
  }

  const nuevo = () => {
    setAviso("");
    setError("");
    setEditando({ id: null, fila: {} });
  };

  return (
    <>
      <div className="cabecera">
        <h2>{cfg.titulo}</h2>
        <button className="btn" onClick={nuevo}>
          Agregar
        </button>
      </div>
      <Notice tipo="ok">{aviso}</Notice>
      <Notice>{error || errorCarga}</Notice>

      <div className="row">
        <div className="card grow2 tabla-wrap">
          {loading ? (
            <p className="mu">Cargando…</p>
          ) : !data?.length ? (
            <p className="mu">Todavía no hay registros. Usa “Agregar” para crear el primero.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  {cfg.campos.map((c) => (
                    <th key={c.name}>{c.label}</th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((fila) => (
                  <tr key={fila[cfg.pk]}>
                    <td>{fila[cfg.pk]}</td>
                    {cfg.campos.map((c) => (
                      <td key={c.name}>{mostrar(c, fila[c.name])}</td>
                    ))}
                    <td className="acciones">
                      <button
                        className="link"
                        onClick={() => {
                          setAviso("");
                          setEditando({ id: fila[cfg.pk], fila });
                        }}
                      >
                        Editar
                      </button>
                      <button className="link peligro" onClick={() => eliminar(fila)}>
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
          <form
            key={editando.id ?? "nuevo"}
            className="card grow1 formulario"
            onSubmit={guardar}
          >
            <h2>{editando.id ? `Editar ${cfg.singular}` : `Nueva ${cfg.singular}`}</h2>
            {cfg.campos.map((c) => (
              <div className="campo" key={c.name}>
                {c.type === "checkbox" ? (
                  <label className="check">
                    <input
                      type="checkbox"
                      name={c.name}
                      defaultChecked={Boolean(editando.fila[c.name])}
                    />
                    {c.label}
                  </label>
                ) : (
                  <>
                    <label htmlFor={c.name}>{c.label}</label>
                    {c.type === "select" ? (
                      <select id={c.name} name={c.name} defaultValue={editando.fila[c.name] ?? c.opciones[0]}>
                        {c.opciones.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={c.name}
                        name={c.name}
                        type={c.type}
                        step={c.type === "number" ? "any" : undefined}
                        defaultValue={editando.fila[c.name] ?? ""}
                        required
                      />
                    )}
                  </>
                )}
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
