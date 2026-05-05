export async function scanBarcodeFromCamera(timeoutMs = 20000): Promise<string | null> {
  const BarcodeDetectorCtor = (window as any).BarcodeDetector;
  const hasCameraApi = !!navigator.mediaDevices?.getUserMedia;

  if (!BarcodeDetectorCtor || !hasCameraApi) {
    return null;
  }

  const overlay = document.createElement("div");
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "background:rgba(0,0,0,0.72)",
    "z-index:99200",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "padding:16px",
  ].join(";");

  const card = document.createElement("div");
  card.style.cssText = [
    "width:min(92vw,640px)",
    "background:#111827",
    "border-radius:16px",
    "overflow:hidden",
    "box-shadow:0 18px 50px rgba(0,0,0,0.45)",
  ].join(";");

  const header = document.createElement("div");
  header.style.cssText = "padding:12px 14px;color:#f9fafb;font-weight:600;font-size:14px;";
  header.textContent = "Escaneando codigo de barras...";

  const video = document.createElement("video");
  video.setAttribute("autoplay", "true");
  video.setAttribute("playsinline", "true");
  video.style.cssText = "display:block;width:100%;height:auto;max-height:65vh;background:#000;";

  const footer = document.createElement("div");
  footer.style.cssText = "display:flex;justify-content:flex-end;gap:10px;padding:12px;background:#0b1220;";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = "Cancelar";
  cancelBtn.style.cssText = [
    "min-height:44px",
    "padding:10px 16px",
    "border:none",
    "border-radius:10px",
    "font-weight:600",
    "cursor:pointer",
    "background:#e5e7eb",
    "color:#111827",
  ].join(";");

  footer.appendChild(cancelBtn);
  card.appendChild(header);
  card.appendChild(video);
  card.appendChild(footer);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  let stream: MediaStream | null = null;
  let done = false;
  let timer: number | undefined;
  let poller: number | undefined;

  const cleanup = (result: string | null, resolve: (v: string | null) => void) => {
    if (done) return;
    done = true;

    if (poller) window.clearInterval(poller);
    if (timer) window.clearTimeout(timer);

    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }

    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }

    resolve(result);
  };

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });

    video.srcObject = stream;
    await video.play();

    return await new Promise<string | null>((resolve) => {
      const detector = new BarcodeDetectorCtor({
        formats: [
          "ean_13",
          "ean_8",
          "upc_a",
          "upc_e",
          "code_128",
          "code_39",
          "qr_code",
        ],
      });

      let busy = false;

      poller = window.setInterval(async () => {
        if (busy || done) return;
        busy = true;
        try {
          const codes = await detector.detect(video);
          const rawValue = codes?.[0]?.rawValue;
          if (rawValue) {
            cleanup(String(rawValue), resolve);
            return;
          }
        } catch {
          // Ignore transient detection errors.
        } finally {
          busy = false;
        }
      }, 380);

      timer = window.setTimeout(() => cleanup(null, resolve), timeoutMs);
      cancelBtn.addEventListener("click", () => cleanup(null, resolve));
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) cleanup(null, resolve);
      });
    });
  } catch {
    return null;
  } finally {
    if (!done && document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
  }
}
