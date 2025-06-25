import React, { useState, useEffect, useCallback } from "react";
import html2canvas from "html2canvas";
import { MarkerArea } from "markerjs3";

export const FeedbackHotkey: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);

  const capture = useCallback(async () => {
    const target = document.querySelector("#root") as HTMLElement;
    if (!target) return;
    const canvas = await html2canvas(target, { backgroundColor: undefined });
    setImage(canvas.toDataURL("image/png"));
  }, []);

  const annotate = useCallback(
    (uri: string) =>
      new Promise<string>((resolve) => {
        const img = new Image();
        img.src = uri;
        img.onload = () => {
          const markerArea = new MarkerArea(img);
          markerArea.addEventListener("render", (event) => {
            resolve(event.dataUrl as string);
          });
          markerArea.show();
        };
      }),
    []
  );

  const send = useCallback(async (annotated: string) => {
    const payload = {
      image: annotated,
      route: window.location.pathname,
      time: new Date().toISOString(),
      build: "garage-dev",
      userAgent: navigator.userAgent,
    };
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.info("[FeedbackHotkey] Sent");
    } catch (err) {
      console.error("[FeedbackHotkey] Failed", err);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === "F12") {
        e.preventDefault();
        capture();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [capture]);

  useEffect(() => {
    if (!image) return;
    (async () => {
      const annotated = await annotate(image);
      await send(annotated);
      setImage(null);
    })();
  }, [image, annotate, send]);

  return null;
};
