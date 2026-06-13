import React from "react";
import ReactDOM from "react-dom/client";

import { ConsoleApp } from "./ConsoleApp";
import { DemoBanner } from "../components/DemoBanner";
import "../styles/tokens.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DemoBanner />
    <ConsoleApp />
  </React.StrictMode>,
);
