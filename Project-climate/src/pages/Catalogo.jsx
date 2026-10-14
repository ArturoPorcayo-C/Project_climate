import { useState } from "react";
import { RECURSOS } from "../api/recursos";
import CrudResource from "../components/CrudResource";

export default function Catalogo() {
  const [tab, setTab] = useState("ubicaciones");
  return (
    <>
      <h1>Catálogo</h1>
      <div className="tabs" role="tablist">
        {Object.entries(RECURSOS).map(([id, cfg]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={`tab ${tab === id ? "on" : ""}`}
            onClick={() => setTab(id)}
          >
            {cfg.titulo}
          </button>
        ))}
      </div>
      <CrudResource key={tab} cfg={RECURSOS[tab]} />
    </>
  );
}
