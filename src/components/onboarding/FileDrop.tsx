"use client";

import { CloudUpload, X } from "lucide-react";
import { useRef, useState } from "react";
import { ACCEPTED_UPLOADS, MAX_UPLOAD_BYTES } from "./uploadAttachment";

/** Click-or-drop file picker. The file is uploaded when the form is submitted. */
export default function FileDrop({
  id,
  file,
  onFile,
  compact = false,
}: {
  id: string;
  file: File | null;
  onFile: (file: File | null) => void;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [dragging, setDragging] = useState(false);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_UPLOAD_BYTES) {
      setError("Files must be 10 MB or smaller.");
      return;
    }
    setError(undefined);
    onFile(f);
  };

  return (
    <div>
      <input
        ref={input}
        id={id}
        type="file"
        accept={ACCEPTED_UPLOADS}
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {file ? (
        <div className="flex h-12 items-center justify-between gap-3 rounded-lg border border-[#e4e4e7] bg-[#fafafa] px-4 text-[14px] text-[#0f172a]">
          <span className="truncate">{file.name}</span>
          <button
            type="button"
            aria-label="Remove file"
            onClick={() => {
              onFile(null);
              if (input.current) input.current.value = "";
            }}
            className="text-[#94a3b8] hover:text-[#ef4444]"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          className={`flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-[14px] text-[#94a3b8] transition-colors hover:border-[#00c9a7] ${
            compact ? "h-[76px]" : "h-[140px]"
          } ${dragging ? "border-[#00c9a7] bg-[#e6f9f5]" : "border-[#cbd5e1] bg-[#fafafa]"}`}
        >
          <CloudUpload className="size-6 text-[#94a3b8]" />
          {compact ? (
            "Click to upload file"
          ) : (
            <>
              <span>
                <span className="font-semibold text-[#00c9a7]">Click to upload</span> or drag and drop
              </span>
              <span className="text-[11px]">PDF, JPG, PNG up to 10MB</span>
            </>
          )}
        </button>
      )}
      {error && <p className="mt-2 text-[12px] text-[#ef4444]">{error}</p>}
    </div>
  );
}
