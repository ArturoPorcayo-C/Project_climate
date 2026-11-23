import { useState } from "react";
import { apiFetch, setToken } from "../api/client";
import Notice from "./Notice";

export default function Login({ onEntrar }) {
  const [valor, setValor] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    setToken(valor.trim());
    try {
      // Petición de prueba: si el token es válido responde 200.
      await apiFetch("/calendario/semanas");
      onEntrar();
    } catch (err) {
      setToken("");
      setError(err.status === 403 || err.status === 401 ? "El token no es válido." : err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login">
      <form className="card login-card" onSubmit={enviar}>
        <h1>Clima MX</h1>
        <p className="mu">Ingresa el token de acceso que te entregó el administrador.</p>
        <div className="campo">
          <label htmlFor="token">Token de acceso</label>
          <input
            id="token"
            type="password"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            autoComplete="off"
            required
          />
        </div>
        <Notice>{error}</Notice>
        <button className="btn" disabled={cargando}>
          {cargando ? "Verificando…" : "Entrar"}
        </button>
        <span className="mu">El token se guarda solo en memoria y se pierde al cerrar la pestaña.</span>
      </form>
    </div>
  );
}
