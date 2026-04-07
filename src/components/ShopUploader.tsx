import { useState, useCallback } from "react";
import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "../lib/uploadthing";

const { useUploadThing } = generateReactHelpers<OurFileRouter>();

interface ShopUploaderProps {
  route: "dyeReference" | "pocketPhoto";
  label: string;
  hint?: string;
}

export default function ShopUploader({ route, label, hint }: ShopUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { startUpload } = useUploadThing(route, {
    onClientUploadComplete: (res) => {
      const url = res?.[0]?.ufsUrl ?? res?.[0]?.url;
      if (url) {
        window.dispatchEvent(
          new CustomEvent("shopUploadComplete", { detail: { route, url } })
        );
        setUploaded(true);
      }
      setUploading(false);
    },
    onUploadError: (err) => {
      setError(err.message);
      setUploading(false);
    },
  });

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setPreview(URL.createObjectURL(file));
      setUploaded(false);
      setError(null);
      setUploading(true);
      await startUpload([file]);
    },
    [startUpload]
  );

  const inputId = `shop-upload-${route}`;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      <label
        htmlFor={inputId}
        className={`flex items-center justify-center gap-2 w-full border-2 border-dashed rounded-lg py-4 px-4 cursor-pointer transition ${
          uploaded
            ? "border-green-400 bg-green-50 text-green-700"
            : uploading
              ? "border-gray-300 bg-gray-50 text-gray-400 cursor-wait"
              : "border-gray-300 bg-gray-50 text-gray-500 hover:border-gray-400"
        }`}
      >
        {uploaded ? (
          <span className="text-sm font-medium">Photo uploaded — tap to replace</span>
        ) : uploading ? (
          <span className="text-sm font-medium">Uploading…</span>
        ) : (
          <span className="text-sm font-medium">Tap to upload a photo</span>
        )}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
        disabled={uploading}
      />
      {preview && (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
          <img src={preview} alt="Upload preview" className="w-full h-full object-cover" />
          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white text-sm font-medium">Uploading…</span>
            </div>
          )}
        </div>
      )}
      {error && (
        <p className="text-red-600 text-sm">Upload failed: {error}</p>
      )}
    </div>
  );
}
