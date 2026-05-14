import { useEffect, useId } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

type IsbnScannerProps = {
  enabled: boolean;
  onDetected: (code: string) => void;
  onError: (message: string) => void;
};

export default function IsbnScanner({ enabled, onDetected, onError }: IsbnScannerProps) {
  const scannerId = useId().replace(/:/g, "");

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let scanner: Html5Qrcode | null = new Html5Qrcode(scannerId, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128
      ],
      verbose: false
    });
    let cancelled = false;

    const run = async () => {
      const currentScanner = scanner;
      if (!currentScanner) {
        return;
      }

      const scanConfig = {
        fps: 10,
        qrbox: { width: 300, height: 160 },
        aspectRatio: 1.7777778,
        disableFlip: false
      };

      try {
        await currentScanner.start(
          { facingMode: { exact: "environment" } },
          scanConfig,
          (decodedText) => {
            onDetected(decodedText);
          },
          () => undefined
        );
      } catch {
        if (cancelled || !scanner) {
          return;
        }

        try {
          await currentScanner.start(
            { facingMode: "environment" },
            scanConfig,
            (decodedText) => {
              onDetected(decodedText);
            },
            () => undefined
          );
        } catch (cameraError) {
          const message =
            cameraError instanceof Error
              ? cameraError.message
              : "Camera could not start. On iPhone, use Safari over HTTPS and allow camera access.";
          onError(message);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      onError("");

      if (!scanner) {
        return;
      }

      void scanner
        .stop()
        .catch(() => undefined)
        .then(() => {
          scanner?.clear();
        })
        .finally(() => {
          scanner = null;
        });
    };
  }, [enabled, onDetected, onError, scannerId]);

  if (!enabled) {
    return <p>Scanner is paused. Click “Start scanner” to use your camera.</p>;
  }

  return (
    <>
      <p className="help-text">Tip: on iPhone use Safari, allow camera access, and point the back camera at the barcode.</p>
      <div id={scannerId} className="scanner-container" />
    </>
  );
}
