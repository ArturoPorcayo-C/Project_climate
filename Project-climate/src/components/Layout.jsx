const VISTAS = [
  ["panel", "Panel"],
  ["mediciones", "Mediciones"],
  ["predicciones", "Predicciones"],
  ["catalogo", "Catálogo"],
];

export default function Layout({ vista, onCambiar, onSalir, children }) {
  return (
    <div className="app">
      <nav className="side" aria-label="Principal">
        <b>Clima MX</b>
        {VISTAS.map(([id, nombre]) => (
          <button
            key={id}
            className={id === vista ? "on" : ""}
            aria-current={id === vista ? "page" : undefined}
            onClick={() => onCambiar(id)}
          >
            {nombre}
          </button>
        ))}
        <button className="salir" onClick={onSalir}>
          Cerrar sesión
        </button>
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}
