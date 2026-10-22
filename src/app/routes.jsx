import { Route, Routes } from "react-router-dom";
import NotFoundPage from "@/pages/NotFoundPage.jsx";
import ProductDetailsPage from "@/pages/ProductDetailsPage.jsx";
import ProductListPage from "@/pages/ProductListPage.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ProductListPage />} />
      <Route path="/products/:id" element={<ProductDetailsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
