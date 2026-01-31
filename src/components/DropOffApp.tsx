import { ConvexProvider, ConvexReactClient } from "convex/react";
import DropOff from "./DropOff";

const convex = new ConvexReactClient(import.meta.env.PUBLIC_CONVEX_URL);

interface Props {
  orderId: string;
}

export default function DropOffApp({ orderId }: Props) {
  return (
    <ConvexProvider client={convex}>
      <DropOff orderId={orderId} />
    </ConvexProvider>
  );
}
