import React from "react";
import ReactDOM from "react-dom/client";

import DesignApp from "./design/DesignApp";
import "./styles/tokens.css";
import "./styles/app.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DesignApp />
  </React.StrictMode>,
);
