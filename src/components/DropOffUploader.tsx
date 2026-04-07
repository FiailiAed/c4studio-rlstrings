import { useState, useCallback, useEffect, useRef } from "react";
import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "../lib/uploadthing";

const { useUploadThing } = generateReactHelpers<OurFileRouter>();

interface DropOffUploaderProps {
  targetInputId: string;
  formId: string;
  submitBtnId: string;
}

export default function DropOffUploader({ targetInputId, formId, submitBtnId }: DropOffUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [hasFile, setHasFile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingFileRef = useRef<File | null>(null);

  const { startUpload } = useUploadThing("dropOffPhoto", {
    onClientUploadComplete: (res) => {
      const url = res?.[0]?.ufsUrl ?? res?.[0]?.url;
      const input = document.getElementById(targetInputId) as HTMLInputElement | null;
      if (url && input) input.value = url;
      pendingFileRef.current = null;
      setHasFile(false);
      setUploading(false);
      const form = document.getElementById(formId) as HTMLFormElement | null;
      form?.submit();
    },
    onUploadError: (err) => {
      setError(err.message);
      setUploading(false);
      const btn = document.getElementById(submitBtnId) as HTMLButtonElement | null;
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Confirm Drop-Off";
      }
    },
  });

  // Keep a stable ref to startUpload so the form submit listener never goes stale
  const startUploadRef = useRef(startUpload);
  useEffect(() => { startUploadRef.current = startUpload; }, [startUpload]);

  // Attach to the form's submit event once on mount — React owns the confirm dialog
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    const handleSubmit = (e: Event) => {
      e.preventDefault();

      if (!confirm("Confirm drop-off? Make sure your stick is at Stellar Athletics.")) return;

      const btn = document.getElementById(submitBtnId) as HTMLButtonElement | null;

      if (pendingFileRef.current) {
        setUploading(true);
        if (btn) {
          btn.disabled = true;
          btn.textContent = "Uploading…";
        }
        startUploadRef.current([pendingFileRef.current]);
      } else {
        form.submit();
      }
    };

    form.addEventListener("submit", handleSubmit);
    return () => form.removeEventListener("submit", handleSubmit);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    pendingFileRef.current = file;
    setPreview(URL.createObjectURL(file));
    setHasFile(true);
    setError(null);
  }, []);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700">
        Photo of your head <span className="text-gray-400 font-normal">(optional)</span>
      </label>
      <label
        htmlFor="drop-off-photo-input"
        className={`flex items-center justify-center gap-2 w-full border-2 border-dashed rounded-lg py-4 px-4 cursor-pointer transition ${
          hasFile
            ? "border-green-400 bg-green-50 text-green-700"
            : "border-gray-300 bg-gray-50 text-gray-500 hover:border-gray-400"
        }`}
      >
        {hasFile ? (
          <span className="text-sm font-medium">✓ Photo ready — tap to retake</span>
        ) : (
          <span className="text-sm font-medium">📷 Take a photo</span>
        )}
      </label>
      <input
        id="drop-off-photo-input"
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFileChange}
        disabled={uploading}
      />
      {preview && (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
          <img src={preview} alt="Drop-off photo preview" className="w-full h-full object-cover" />
          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white text-sm font-medium">Uploading…</span>
            </div>
          )}
        </div>
      )}
      {error && (
        <p className="text-red-600 text-sm">Upload failed: {error}. You can still submit without a photo.</p>
      )}
    </div>
  );
}
