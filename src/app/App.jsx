import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "@/app/routes.jsx";
import { appStore } from "@/store/appStore.js";
import "@/styles/app.css";

export default function App() {
  useEffect(() => {
    void appStore.initialize();
  }, []);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
