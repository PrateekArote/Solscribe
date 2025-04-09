"use client";
import { BACKEND_URL, CLOUDFRONT_URL } from "@/utils";
import axios, { AxiosError } from "axios";
import { useState } from "react";
import { toast } from "sonner";

export function UploadImage({
  onImageAdded,
  image,
}: {
  onImageAdded: (image: string) => void;
  image?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  async function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return;

    setUploading(true);
    setUploadProgress(0);
    const toastId = toast.loading("Starting upload...");

    try {
      const file = e.target.files[0];
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please connect your wallet first");
      }

      // 1. Get presigned URL
      toast.loading("Preparing upload...", { id: toastId });
      const response = await axios.get(`${BACKEND_URL}/v1/user/presignedUrl`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Presigned URL:", response.data.preSignedUrl);
      console.log("Fields for S3:", response.data.fields);

      // 2. Prepare form data
      const formData = new FormData();
      const { fields } = response.data;
       for (const [key, value] of Object.entries(fields)) {
       if (key !== "bucket") {
    formData.append(key, value as string);
  }
}

      
      formData.append("file", file);

      // 3. Upload to S3
      toast.loading("Uploading to storage...", { id: toastId });

      try {
        const uploadRes = await axios.post(response.data.preSignedUrl, formData, {
          // Don't manually set content-type, let the browser handle it
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            setUploadProgress(percentCompleted);
            toast.loading(`Uploading: ${percentCompleted}%`, { id: toastId });
          },
        });

        console.log("S3 upload success response:", uploadRes);
      } catch (uploadErr) {
        console.error("S3 upload failed:", uploadErr);
        throw new Error("Upload to S3 failed");
      }

      // 4. Finalize
      const imageUrl = `${CLOUDFRONT_URL}/${response.data.fields.key}`;
      onImageAdded(imageUrl);
      toast.success("Upload completed!", { id: toastId });
    } catch (err) {
      const error = err as Error | AxiosError;
      console.error("Upload failed:", error);

      let errorMessage = "Upload failed. Please try again.";

      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, { id: toastId });
    } finally {
      setUploading(false);
    }
  }

  if (image) {
    return <img className="p-2 w-96 rounded" src={image} alt="Uploaded content" />;
  }

  return (
    <div className="w-40 h-40 rounded border text-2xl cursor-pointer relative">
      <div className="h-full flex justify-center items-center">
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="text-sm">Uploading... {uploadProgress}%</div>
            <progress value={uploadProgress} max="100" className="w-full h-2 rounded" />
          </div>
        ) : (
          <>
            +
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={onFileSelect}
              accept="image/*"
            />
          </>
        )}
      </div>
    </div>
  );
}
