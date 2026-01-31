import { ConvexProvider, ConvexReactClient } from "convex/react";
import TestOrderForm from "./TestOrderForm";

const convex = new ConvexReactClient(import.meta.env.PUBLIC_CONVEX_URL);

export default function TestOrderApp() {
  return (
    <ConvexProvider client={convex}>
      <TestOrderForm />
    </ConvexProvider>
  );
}
