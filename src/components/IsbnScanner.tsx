import { useEffect, useId } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";

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

    const scanner = new Html5QrcodeScanner(
      scannerId,
      {
        fps: 10,
        qrbox: { width: 280, height: 140 },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128
        ],
        rememberLastUsedCamera: true
      },
      false
    );

    scanner.render(
      (decodedText) => {
        onDetected(decodedText);
        scanner.clear().catch(() => undefined);
      },
      () => undefined
    );

    return () => {
      scanner.clear().catch(() => undefined);
      onError("");
    };
  }, [enabled, onDetected, onError, scannerId]);

  if (!enabled) {
    return <p>Scanner is paused. Click “Start scanner” to use your camera.</p>;
  }

  return <div id={scannerId} className="scanner-container" />;
}
