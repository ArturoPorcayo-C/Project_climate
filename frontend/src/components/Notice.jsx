export default function Notice({ tipo = "error", children }) {
  if (!children) return null;
  return (
    <p role={tipo === "error" ? "alert" : "status"} className={`aviso ${tipo}`}>
      {children}
    </p>
  );
}
