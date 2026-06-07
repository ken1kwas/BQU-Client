import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function getReaderParam(name: string): string {
  return new URLSearchParams(window.location.search).get(name) ?? "";
}

export function PdfCanvasReader() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [title] = useState(() => getReaderParam("title") || "Kitabxana oxuyucusu");
  const [status, setStatus] = useState("Oxuyucu açılır...");

  useEffect(() => {
    let cancelled = false;
    const renderedCanvases: HTMLCanvasElement[] = [];

    const renderPdf = async () => {
      const sourceUrl = getReaderParam("src");
      const container = containerRef.current;

      if (!sourceUrl || !container) {
        setStatus("Oxuyucu mənbəsi tapılmadı.");
        return;
      }

      try {
        setStatus("Sənəd yüklənir...");
        const response = await fetch(sourceUrl);
        const bytes = await response.arrayBuffer();
        URL.revokeObjectURL(sourceUrl);
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;

        if (cancelled) return;

        container.innerHTML = "";
        setStatus("");

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) return;

          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.55 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) continue;

          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.className =
            "mx-auto mb-5 block max-w-full bg-white shadow-lg select-none";
          canvas.setAttribute("aria-label", `Səhifə ${pageNumber}`);
          renderedCanvases.push(canvas);
          container.appendChild(canvas);

          await page.render({ canvasContext: context, viewport }).promise;
        }
      } catch {
        if (!cancelled) {
          setStatus("Bu sənədi açmaq mümkün olmadı.");
        }
      }
    };

    void renderPdf();

    return () => {
      cancelled = true;
      renderedCanvases.forEach((canvas) => canvas.remove());
    };
  }, []);

  useEffect(() => {
    const blockShortcut = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && (key === "s" || key === "p")) {
        event.preventDefault();
      }
    };

    const blockContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    window.addEventListener("keydown", blockShortcut);
    window.addEventListener("contextmenu", blockContextMenu);

    return () => {
      window.removeEventListener("keydown", blockShortcut);
      window.removeEventListener("contextmenu", blockContextMenu);
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/95 px-5 py-3 backdrop-blur">
        <h1 className="truncate text-base font-semibold">{title}</h1>
      </header>
      <section className="px-4 py-6">
        {status ? (
          <div className="flex min-h-[70vh] items-center justify-center text-sm text-slate-300">
            {status}
          </div>
        ) : null}
        <div ref={containerRef} className="mx-auto max-w-5xl" />
      </section>
    </main>
  );
}
