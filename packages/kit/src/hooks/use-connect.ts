"use client";

import { useMemo } from "react";

import { SUPPORTED_STACKS_WALLETS } from "../constants/wallets";
import { useStacksWalletContext } from "../provider/stacks-wallet-provider";

export const useConnect = () => {
  const { connect, status } = useStacksWalletContext();

  const value = useMemo(
    () => ({
      connect,
      connectors: SUPPORTED_STACKS_WALLETS,
      isPending: status === "connecting",
    }),
    [connect, status]
  );

  return value;
};
