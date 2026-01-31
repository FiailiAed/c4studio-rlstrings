import { ConvexProvider, ConvexReactClient } from "convex/react";
import OrderSuccess from "./OrderSuccess";

const convex = new ConvexReactClient(import.meta.env.PUBLIC_CONVEX_URL);

interface Props {
  orderId: string;
}

export default function OrderSuccessApp({ orderId }: Props) {
  return (
    <ConvexProvider client={convex}>
      <OrderSuccess orderId={orderId} />
    </ConvexProvider>
  );
}
