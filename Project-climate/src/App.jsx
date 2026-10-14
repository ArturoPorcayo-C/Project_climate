import { useEffect, useState } from "react";
import { onTokenRechazado, setToken } from "./api/client";
import Layout from "./components/Layout";
import Login from "./components/Login";
import Panel from "./pages/Panel";
import Mediciones from "./pages/Mediciones";
import Predicciones from "./pages/Predicciones";
import Catalogo from "./pages/Catalogo";

const PAGINAS = {
  panel: Panel,
  mediciones: Mediciones,
  predicciones: Predicciones,
  catalogo: Catalogo,
};

export default function App() {
  const [autenticado, setAutenticado] = useState(false);
  const [vista, setVista] = useState("panel");

  const salir = () => {
    setToken("");
    setAutenticado(false);
    setVista("panel");
  };

  // Si la API rechaza el token en cualquier momento, volvemos al acceso.
  useEffect(() => {
    onTokenRechazado(() => {
      setToken("");
      setAutenticado(false);
    });
  }, []);

  if (!autenticado) return <Login onEntrar={() => setAutenticado(true)} />;

  const Pagina = PAGINAS[vista];
  return (
    <Layout vista={vista} onCambiar={setVista} onSalir={salir}>
      <Pagina />
    </Layout>
  );
}
