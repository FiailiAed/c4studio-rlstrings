import { ConvexProvider, ConvexReactClient } from "convex/react";
import InventoryManager from "./InventoryManager";

const convex = new ConvexReactClient(import.meta.env.PUBLIC_CONVEX_URL);

export default function InventoryManagerApp() {
  return (
    <ConvexProvider client={convex}>
      <InventoryManager />
    </ConvexProvider>
  );
}
