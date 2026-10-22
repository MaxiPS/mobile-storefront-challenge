import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card.jsx";

export default function NotFoundPage() {
  return (
    <main className="app-shell">
      <Card className="route-card">
        <CardHeader>
          <p className="eyebrow">Mobile Storefront</p>
          <h1 className="welcome-title">Page not found</h1>
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
