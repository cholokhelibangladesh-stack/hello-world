import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2 } from "lucide-react";

interface PreviewInfo {
  fullName?: string;
  username?: string;
  role?: string;
  sportLabel?: string;
  stats?: { label: string; value: string }[];
}

interface AvatarCropDialogProps {
  file: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (blob: Blob) => Promise<void> | void;
  /** Output aspect ratio (width / height). Card is 4/5 on mobile. */
  aspect?: number;
  /** Output pixel width. Height derived from aspect. */
  outputWidth?: number;
  /** Kept for compatibility; the round crop needs no extra info. */
  preview?: PreviewInfo;
}

/**
 * Interactive avatar positioner: pan + zoom to frame the photo exactly
 * as it will appear inside the profile card, then export a cropped blob.
 */
const AvatarCropDialog = ({
  file,
  open,
  onOpenChange,
  onConfirm,
  aspect = 1,
  outputWidth = 720,
  preview,
}: AvatarCropDialogProps) => {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!file) { setImgUrl(null); setImgSize(null); return; }
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    const img = new Image();
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Base scale so the image "covers" the frame at zoom = 1
  const getBaseScale = useCallback(() => {
    if (!imgSize || !frameRef.current) return 1;
    const fw = frameRef.current.clientWidth;
    const fh = frameRef.current.clientHeight;
    return Math.max(fw / imgSize.w, fh / imgSize.h);
  }, [imgSize]);

  const clampOffset = useCallback((x: number, y: number, z: number) => {
    if (!imgSize || !frameRef.current) return { x, y };
    const fw = frameRef.current.clientWidth;
    const fh = frameRef.current.clientHeight;
    const base = getBaseScale();
    const dw = imgSize.w * base * z;
    const dh = imgSize.h * base * z;
    const maxX = Math.max(0, (dw - fw) / 2);
    const maxY = Math.max(0, (dh - fh) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, [imgSize, getBaseScale]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setOffset(clampOffset(dragRef.current.ox + dx, dragRef.current.oy + dy, zoom));
  };
  const onPointerUp = () => { dragRef.current = null; };

  const onZoom = (v: number[]) => {
    const z = v[0];
    setZoom(z);
    setOffset((o) => clampOffset(o.x, o.y, z));
  };

  const handleConfirm = async () => {
    if (!imgUrl || !imgSize || !frameRef.current) return;
    setSaving(true);
    try {
      const fw = frameRef.current.clientWidth;
      const fh = frameRef.current.clientHeight;
      const base = getBaseScale();
      const scale = base * zoom;
      // Image top-left in frame coordinates
      const dw = imgSize.w * scale;
      const dh = imgSize.h * scale;
      const imgLeft = (fw - dw) / 2 + offset.x;
      const imgTop = (fh - dh) / 2 + offset.y;

      // Source rectangle on the natural image that corresponds to the frame
      const sx = (-imgLeft) / scale;
      const sy = (-imgTop) / scale;
      const sw = fw / scale;
      const sh = fh / scale;

      const outW = outputWidth;
      const outH = Math.round(outputWidth / aspect);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = imgUrl;
      });
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Encode failed"))), "image/jpeg", 0.92)
      );
      await onConfirm(blob);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move and scale</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          <div
            ref={frameRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="relative mx-auto w-full max-w-[280px] overflow-hidden rounded-[28px] bg-secondary ring-1 ring-border select-none touch-none cursor-grab active:cursor-grabbing"
            style={{ aspectRatio: String(aspect) }}
          >
            {imgUrl && imgSize && (
              <img
                src={imgUrl}
                alt="Crop preview"
                draggable={false}
                className="absolute left-1/2 top-1/2 max-w-none pointer-events-none"
                style={{
                  width: imgSize.w * getBaseScale() * zoom,
                  height: imgSize.h * getBaseScale() * zoom,
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                }}
              />
            )}

          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Zoom</span>
              <span>{zoom.toFixed(2)}×</span>
            </div>
            <Slider value={[zoom]} min={1} max={4} step={0.01} onValueChange={onZoom} />
          </div>

          <p className="footnote text-center">Drag to move. Use the slider to zoom.</p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={saving || !imgSize}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save photo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AvatarCropDialog;
