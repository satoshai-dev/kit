"use client";

import { useMemo } from "react";

import { useStacksWalletContext } from "../provider/stacks-wallet-provider";

export const useDisconnect = () => {
  const { disconnect } = useStacksWalletContext();

  return useMemo(
    () => ({
      disconnect,
    }),
    [disconnect]
  );
};
