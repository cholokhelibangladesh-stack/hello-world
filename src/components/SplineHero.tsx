import { Suspense, lazy } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

interface SplineHeroProps {
  scene: string;
  className?: string;
  onLoad?: () => void;
}

export default function SplineHero({ scene, className = "", onLoad }: SplineHeroProps) {
  return (
    <Suspense fallback={null}>
      <Spline
        scene={scene}
        className={className}
        onLoad={onLoad}
      />
    </Suspense>
  );
}
