import { forwardRef } from "react";
import { VideoOff } from "lucide-react";
import { useMediaUrl } from "@/lib/media";

type Props = Omit<React.VideoHTMLAttributes<HTMLVideoElement>, "src"> & {
  /** URL as stored in the row (may point at a private bucket). */
  src: string | null | undefined;
  /** Media fragment appended once resolved, e.g. "#t=1.5" for a poster frame. */
  fragment?: string;
};

/**
 * <video> for stored media: swaps the stored URL for a signed one, shows a quiet placeholder
 * while resolving and a clear state when the viewer isn't allowed to watch it.
 */
const StorageVideo = forwardRef<HTMLVideoElement, Props>(({ src, fragment = "", className = "", ...rest }, ref) => {
  const { src: resolved, loading, failed } = useMediaUrl(src);
  if (loading) return <div className={`${className} animate-pulse bg-muted`} aria-busy="true" aria-label="Loading video" />;
  if (failed || !resolved) {
    return (
      <div className={`${className} grid place-items-center bg-muted text-muted-foreground`} role="img" aria-label="Video unavailable">
        <VideoOff className="h-6 w-6" aria-hidden="true" />
      </div>
    );
  }
  return <video ref={ref} src={resolved + fragment} className={className} {...rest} />;
});
StorageVideo.displayName = "StorageVideo";

export default StorageVideo;
