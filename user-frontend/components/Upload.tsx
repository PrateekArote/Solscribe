"use client";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { UploadImage } from "@/components/UploadImage";
import { BACKEND_URL, NEXT_PUBLIC_PARENT_WALLET_ADDRESS } from "@/utils";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { WalletAdapterProps } from "@solana/wallet-adapter-base";

interface TaskSubmission {
  options: { imageUrl: string }[];
  title: string;
  signature: string;
}

export const Upload = ({
  publicKey,
  sendTransaction,
}: {
  publicKey: PublicKey | null;
  sendTransaction: WalletAdapterProps["sendTransaction"];
}) => {
  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const { connection } = useConnection();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!signature) {
      toast.error("Signature not found");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a task title");
      return;
    }
    if (images.length < 2) {
      toast.error("Please upload at least 2 images");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Submitting task to workers");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required. Please login.");
      }

      const payload: TaskSubmission = {
        options: images.map(imageUrl => ({ imageUrl })),
        title,
        signature
      };

      const response = await axios.post(`${BACKEND_URL}/v1/user/task`, payload, {
        headers: {
          Authorization: token,
          "Content-Type": "application/json"
        }
      });

      toast.success("Task submitted successfully", {
        description: `TASK ID: ${response.data.id}`,
        id: toastId
      });
      router.push(`/task/${response.data.id}`);
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : error instanceof Error
        ? error.message
        : "Submission failed";
      
      toast.error(errorMessage, { id: toastId });
      console.error("Submission error:", error);
    } finally {
      setLoading(false);
    }
  };

  const makePayment = async () => {
    if (!publicKey || !sendTransaction) {
      toast.error("Wallet not connected");
      return;
    }
    if (!NEXT_PUBLIC_PARENT_WALLET_ADDRESS) {
      toast.error("Parent wallet address not configured");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a task title");
      return;
    }
    if (images.length < 2) {
      toast.error("Please upload at least 2 images");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Processing payment...");

    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(NEXT_PUBLIC_PARENT_WALLET_ADDRESS),
          lamports: 100000000, // 0.1 SOL
        })
      );

      const txSignature = await sendTransaction(transaction, connection, {
        preflightCommitment: "confirmed",
        skipPreflight: false,
      });

      toast.success("Payment successful", {
        description: `Transaction: ${txSignature}`,
        id: toastId
      });
      setSignature(txSignature);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Payment failed";
      toast.error(errorMessage, { id: toastId });
      console.error("Payment error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageAdded = (imageUrl: string) => {
    setImages(prev => [...prev, imageUrl]);
  };

  return (
    <div className="flex justify-center">
      <div className="max-w-screen-lg w-full">
        <h1 className="text-2xl text-left pt-20 w-full pl-4">Create a task</h1>

        <div className="mt-8 pl-4">
          <label className="block text-md font-medium text-gray-900 mb-1">
            Task details
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            placeholder="What is your task?"
            required
          />
        </div>

        <div className="mt-8 pl-4">
          <label className="block text-md font-medium text-gray-900 mb-1">
            Add Images (Minimum 2)
          </label>
          <div className="flex flex-wrap gap-4 pt-2">
            {images.map((image, index) => (
              <UploadImage
                key={index}
                image={image}
                onImageAdded={handleImageAdded}
              />
            ))}
            <UploadImage onImageAdded={handleImageAdded} />
          </div>
        </div>

        <div className="flex justify-center mt-8">
          {loading ? (
            <button
              disabled
              className="mt-4 text-white bg-gray-500 font-medium rounded-full text-sm px-5 py-2.5"
            >
              Processing...
            </button>
          ) : signature ? (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="mt-4 text-white bg-gray-800 hover:bg-gray-700 font-medium rounded-full text-sm px-5 py-2.5"
            >
              Submit Task
            </button>
          ) : (
            <button
              onClick={makePayment}
              className="mt-4 text-white bg-gray-800 hover:bg-gray-700 font-medium rounded-full text-sm px-5 py-2.5"
            >
              Pay 0.1 SOL to Submit Task
            </button>
          )}
        </div>
      </div>
    </div>
  );
};