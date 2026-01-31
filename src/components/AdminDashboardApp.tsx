import { ConvexProvider, ConvexReactClient } from "convex/react";
import AdminDashboard from "./AdminDashboard";

const convex = new ConvexReactClient(import.meta.env.PUBLIC_CONVEX_URL);

export default function AdminDashboardApp() {
  return (
    <ConvexProvider client={convex}>
      <AdminDashboard />
    </ConvexProvider>
  );
}
