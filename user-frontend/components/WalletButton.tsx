import {
  WalletDisconnectButton,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import React, { useEffect } from "react";
import { toast } from "sonner";
import { useWallet } from "@solana/wallet-adapter-react";

export default function WalletButton() {
  const { publicKey, signMessage, connected } = useWallet();

  const handleAuth = async () => {
    if (!publicKey || !signMessage) return;

    try {
      // Show sign message popup
      const message = new TextEncoder().encode("Sign into Mechanical Turks");
      await signMessage(message);

      // Set dummy token for demo purposes
      localStorage.setItem("token", "demo-token");

      toast.success("Signed in successfully");
    } catch (error) {
      console.error("Login failed:", error);
      toast.error("Login failed. Please try again.");
    }
  };

  useEffect(() => {
    if (connected) {
      handleAuth();
    }
  }, [connected]);

  const handleDisconnect = () => {
    localStorage.removeItem("token");
    toast("You are logged out.");
  };

  return (
    <>
      {publicKey ? (
        <WalletDisconnectButton 
          onClick={handleDisconnect}
          style={{
            backgroundColor: "#512da8",
            color: "white",
            borderRadius: "8px",
            padding: "8px 16px"
          }}
        />
      ) : (
        <WalletMultiButton
          style={{
            backgroundColor: "#512da8",
            color: "white",
            borderRadius: "8px",
            padding: "8px 16px"
          }}
        />
      )}
    </>
  );
}
