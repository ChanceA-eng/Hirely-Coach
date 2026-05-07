import { Suspense } from "react";
import PathMap from "../components/foundation/PathMap";

export default function FoundationHomePage() {
  return (
    <Suspense fallback={null}>
      <PathMap />
    </Suspense>
  );
}
