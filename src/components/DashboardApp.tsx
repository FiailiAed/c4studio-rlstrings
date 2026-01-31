import { ConvexProvider, ConvexReactClient } from "convex/react";
import OrdersDashboard from "./OrdersDashboard";

const convex = new ConvexReactClient(import.meta.env.PUBLIC_CONVEX_URL);

export default function DashboardApp() {
  return (
    <ConvexProvider client={convex}>
      <OrdersDashboard />
    </ConvexProvider>
  );
}
