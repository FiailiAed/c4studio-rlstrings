import { useState, useCallback } from "react";
import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "../../lib/uploadthing";

const { useUploadThing } = generateReactHelpers<OurFileRouter>();

interface ProductImageUploaderProps {
  /** ID of the hidden <input> on the page that receives the JSON array of image URLs */
  hiddenInputId: string;
  /** Pre-populated URLs for edit mode */
  initialImages?: string[];
}

export default function ProductImageUploader({ hiddenInputId, initialImages = [] }: ProductImageUploaderProps) {
  const [urls, setUrls] = useState<string[]>(initialImages);
  const [error, setError] = useState<string | null>(null);

  const syncHiddenInput = (nextUrls: string[]) => {
    const el = document.getElementById(hiddenInputId) as HTMLInputElement | null;
    if (el) el.value = JSON.stringify(nextUrls);
  };

  const { startUpload, isUploading } = useUploadThing("productImage", {
    onClientUploadComplete: (res) => {
      const newUrls = res.map((f) => f.ufsUrl ?? (f as { url?: string }).url ?? "").filter(Boolean);
      setUrls((prev) => {
        const merged = [...prev, ...newUrls];
        syncHiddenInput(merged);
        return merged;
      });
      setError(null);
    },
    onUploadError: (err) => {
      setError(err.message);
    },
  });

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (!files.length) return;
      setError(null);
      startUpload(files);
      // Reset file input so the same file can be re-selected if removed
      e.target.value = "";
    },
    [startUpload],
  );

  const removeImage = (index: number) => {
    setUrls((prev) => {
      const next = prev.filter((_, i) => i !== index);
      syncHiddenInput(next);
      return next;
    });
  };

  const canUploadMore = urls.length < 4;

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Images</p>

      {/* Thumbnail grid */}
      {urls.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {urls.map((url, i) => (
            <div key={url} className="relative rounded-md overflow-hidden bg-gray-900 aspect-video">
              <img src={url} alt={`Product image ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80 transition-colors"
                aria-label="Remove image"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {canUploadMore && (
        <label
          className={`flex items-center justify-center gap-2 w-full rounded-md border border-dashed border-white/20 px-4 py-3 text-sm text-gray-400 transition-colors ${
            isUploading
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:border-white/40 hover:text-gray-300"
          }`}
        >
          {isUploading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
              </svg>
              Uploading…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {urls.length === 0 ? "Upload images" : "Add more"} (max {4 - urls.length} remaining)
            </>
          )}
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
      )}

      {error && (
        <p className="text-xs text-red-400">Upload failed: {error}</p>
      )}
    </div>
  );
}
