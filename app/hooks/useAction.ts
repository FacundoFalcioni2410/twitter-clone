"use client";

import { useTransition } from "react";
import type { ActionResult } from "@/app/lib/types";

type Options<T> = {
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAction<T, TArgs extends any[]>(
  action: (...args: TArgs) => Promise<ActionResult<T>>,
  { onSuccess, onError }: Options<T> = {}
) {
  const [isPending, startTransition] = useTransition();

  function execute(...args: TArgs) {
    startTransition(async () => {
      const result = await action(...args);
      if (result.error !== null) {
        onError?.(result.error);
      } else {
        onSuccess?.(result.data);
      }
    });
  }

  return { execute, isPending };
}
