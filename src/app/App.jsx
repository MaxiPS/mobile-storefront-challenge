import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import "@/styles/app.css";

export default function App() {
  return (
    <main className="app-shell">
      <Card className="welcome-card">
        <CardHeader>
          <p className="eyebrow">Nunegal Consulting | Frontend assessment</p>
          <h1 className="welcome-title">Mobile Storefront</h1>
          <CardDescription>
            The project foundation is ready for the product browsing experience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline">
            Getting started
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
