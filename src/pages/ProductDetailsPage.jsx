import { Link, useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card.jsx";

export default function ProductDetailsPage() {
  const { id } = useParams();

  return (
    <main className="app-shell">
      <Card className="route-card">
        <CardHeader>
          <p className="eyebrow">Mobile Storefront</p>
          <h1 className="welcome-title">Product details</h1>
          <CardDescription>Product ID: {id}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className="route-link" to="/">
            Back to products
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
