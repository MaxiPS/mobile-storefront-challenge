import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card.jsx";

export default function ProductListPage() {
  return (
    <main className="app-shell">
      <Card className="route-card">
        <CardHeader>
          <p className="eyebrow">Mobile Storefront</p>
          <h1 className="welcome-title">Products</h1>
          <CardDescription>
            The product list will be available here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link className="route-link" to="/products/demo-product">
            View sample product
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
