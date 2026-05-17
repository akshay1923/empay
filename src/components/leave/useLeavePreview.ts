"use client";

import { useEffect, useRef, useState } from "react";
import {
  previewLeaveImpact,
  type LeaveImpactPreview,
} from "@/app/actions/leave";

export type PreviewInput = {
  userId?: string;
  leaveType: "CASUAL" | "SICK" | "EARNED" | "UNPAID";
  startDate: string; // yyyy-mm-dd
  endDate: string;
};

/**
 * Debounced live preview hook for the leave-application form.
 *
 * Returns null until inputs are valid AND the first fetch has resolved.
 * Cancels stale in-flight responses so a fast type-switch doesn't flash
 * earlier results.
 */
export function useLeavePreview(
  input: PreviewInput | null,
  delayMs = 300
): { preview: LeaveImpactPreview | null; loading: boolean } {
  const [preview, setPreview] = useState<LeaveImpactPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!input || !input.startDate || !input.endDate) {
      setPreview(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      const seq = ++requestSeq.current;
      previewLeaveImpact({
        userId: input.userId,
        leaveType: input.leaveType,
        startDate: input.startDate,
        endDate: input.endDate,
      })
        .then((res) => {
          if (seq !== requestSeq.current) return; // a newer request landed
          setPreview(res);
          setLoading(false);
        })
        .catch(() => {
          if (seq !== requestSeq.current) return;
          setPreview({ success: false, error: "Preview failed" });
          setLoading(false);
        });
    }, delayMs);
    return () => clearTimeout(handle);
  }, [
    input?.userId,
    input?.leaveType,
    input?.startDate,
    input?.endDate,
    delayMs,
  ]);

  return { preview, loading };
}
