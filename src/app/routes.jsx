import { useEffect, useRef } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import NotFoundPage from "@/pages/NotFoundPage.jsx";
import ProductDetailsPage from "@/pages/ProductDetailsPage.jsx";
import ProductListPage from "@/pages/ProductListPage.jsx";

function RouteFocusManager() {
  const location = useLocation();
  const previousPathname = useRef(location.pathname);

  useEffect(() => {
    if (previousPathname.current === location.pathname) return;

    document.getElementById("main-content")?.focus();
    previousPathname.current = location.pathname;
  }, [location.pathname]);

  return null;
}

export default function AppRoutes() {
  return (
    <>
      <RouteFocusManager />
      <Routes>
        <Route path="/" element={<ProductListPage />} />
        <Route path="/products/:id" element={<ProductDetailsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
