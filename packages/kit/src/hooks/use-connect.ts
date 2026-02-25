"use client";

import { useMemo } from "react";

import { SUPPORTED_STACKS_WALLETS } from "../constants/wallets";
import { useStacksWalletContext } from "../provider/stacks-wallet-provider";

export const useConnect = () => {
  const { connect, reset, status } = useStacksWalletContext();

  const value = useMemo(
    () => ({
      connect,
      reset,
      connectors: SUPPORTED_STACKS_WALLETS,
      isPending: status === "connecting",
    }),
    [connect, reset, status]
  );

  return value;
};
