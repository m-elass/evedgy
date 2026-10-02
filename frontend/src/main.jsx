import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { ApiError } from "./lib/api";
import { avisar } from "./lib/toast";
import "./fonts.css";
import "./index.css";

// Red de seguridad: si una escritura falla y nadie lo gestionó, se avisa en
// pantalla («No se ha guardado: sin conexión») en vez de fallar en silencio.
window.addEventListener("unhandledrejection", (e) => {
  if (e.reason instanceof ApiError) {
    avisar(e.reason.humano);
    e.preventDefault();
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
