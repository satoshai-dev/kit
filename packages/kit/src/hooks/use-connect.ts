"use client";

import { useMemo } from "react";

import { useStacksWalletContext } from "../provider/stacks-wallet-provider";

export const useConnect = () => {
  const { connect, reset, status } = useStacksWalletContext();

  const value = useMemo(
    () => ({
      connect,
      reset,
      isPending: status === "connecting",
    }),
    [connect, reset, status]
  );

  return value;
};
