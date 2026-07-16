/*
 * components/ErrorBoundary.jsx
 * ────────────────────────────
 * Red de seguridad. Si una seccion lanza un error inesperado (p.ej. la API
 * devuelve algo raro), en vez de dejar la pantalla en blanco mostramos un
 * mensaje sereno y un boton para reintentar. Asi un fallo en una parte no
 * tumba toda la app.
 *
 * Es un componente de clase porque React solo permite capturar errores de
 * render asi (componentDidCatch). Es de los pocos sitios donde una clase es
 * obligatoria.
 */
import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // En produccion esto podria enviarse a un servicio de registro; de momento
    // queda en la consola del navegador para poder depurar.
    console.error("Error capturado por ErrorBoundary:", error, info);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "60vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", textAlign: "center",
          padding: 30, gap: 14,
        }}>
          <div style={{
            fontFamily: "var(--fontDisplay)", fontSize: 24, color: "var(--sepiaInk)", fontWeight: 600,
          }}>Algo se ha torcido aquí</div>
          <p style={{ fontFamily: "var(--fontBody)", fontSize: 14, color: "var(--sepia)", maxWidth: 320, lineHeight: 1.6 }}>
            Esta sección ha tenido un problema. Puedes reintentar; tus datos están a salvo.
          </p>
          <button onClick={this.reset} style={{
            background: "var(--grad-gold)", color: "var(--cream)", border: "none",
            borderRadius: 9, padding: "11px 20px", fontFamily: "var(--fontBody)",
            fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "var(--glow-gold)",
          }}>Reintentar</button>
        </div>
      );
    }
    return this.props.children;
  }
}
