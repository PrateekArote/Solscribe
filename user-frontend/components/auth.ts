import { BACKEND_URL } from "@/utils";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import axios, { AxiosError } from "axios";
import { useEffect } from "react";
import { toast } from "sonner";

export function useWalletSession() {
  const wallet = useWallet();
  
  useEffect(() => {
    const handleAuthentication = async () => {
      if (!wallet.publicKey || !wallet.signMessage) return;
      
      try {
        // First check if we have a valid token
        const token = getToken();
        if (token) {
          const isValid = await verifyToken(token);
          if (isValid) return;
        }
        
        // If no valid token, perform new authentication
        await handleAuth(wallet.publicKey, wallet.signMessage);
      } catch (error) {
        console.error("Authentication error:", error);
        toast.error("Failed to authenticate wallet");
      }
    };

    handleAuthentication();
  }, [wallet.publicKey, wallet.connected, wallet.signMessage]);

  return wallet;
}

async function handleAuth(
  publicKey: PublicKey,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
) {
  try {
    const message = new TextEncoder().encode("Sign into mechanical turks");
    const signature = await signMessage(message);
    
    const response = await axios.post(
      `${BACKEND_URL}/v1/user/signin`,
      {
        publicKey: publicKey.toString(),
        signature: Array.from(signature)
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.token) {
      storeToken(response.data.token);
      toast.success("Wallet connected successfully");
    } else {
      throw new Error("No token received");
    }
  } catch (error) {
    if (error instanceof AxiosError) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(`Authentication failed: ${errorMessage}`);
    } else {
      toast.error("Unexpected error during authentication");
    }
    throw error;
  }
}

async function verifyToken(token: string): Promise<boolean> {
  try {
    await axios.get(`${BACKEND_URL}/v1/user/me`, {
      headers: { Authorization: token }
    });
    return true;
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 401) {
      clearToken();
    }
    return false;
  }
}

// Token management utilities
export const storeToken = (token: string) => {
  localStorage.setItem('token', token);
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

export const clearToken = () => {
  localStorage.removeItem('token');
  delete axios.defaults.headers.common['Authorization'];
};