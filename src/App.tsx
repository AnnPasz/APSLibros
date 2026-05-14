import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import IsbnScanner from "./components/IsbnScanner";
import "./App.css";
import { fetchBookByIsbn, normalizeIsbn } from "./lib/isbn";

type BookForm = {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  year: string;
};

const emptyBook: BookForm = {
  isbn: "",
  title: "",
  author: "",
  publisher: "",
  year: ""
};

export default function App() {
  const [manualIsbn, setManualIsbn] = useState("");
  const [book, setBook] = useState<BookForm>(emptyBook);
  const [scanEnabled, setScanEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Ready to scan or type an ISBN.");
  const [error, setError] = useState("");
  const keyboardScanBuffer = useRef("");
  const keyboardLastTimestamp = useRef(0);

  const effectiveIsbn = useMemo(() => normalizeIsbn(manualIsbn), [manualIsbn]);

  const populateByIsbn = useCallback(async (isbnValue: string) => {
    setLoading(true);
    setError("");
    setStatus("Fetching metadata from Open Library...");

    try {
      const metadata = await fetchBookByIsbn(isbnValue);
      setBook(metadata);
      setManualIsbn(metadata.isbn);
      setStatus("Book record populated successfully.");
      setScanEnabled(false);
    } catch (lookupError) {
      const message = lookupError instanceof Error ? lookupError.message : "Unexpected ISBN lookup error.";
      setError(message);
      setStatus("Waiting for another ISBN...");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleManualLookup = async () => {
    if (!effectiveIsbn) {
      setError("Enter an ISBN value first.");
      return;
    }

    await populateByIsbn(effectiveIsbn);
  };

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      const tagName = target.tagName;
      return tagName === "INPUT" || tagName === "TEXTAREA" || target.isContentEditable;
    };

    const finalizeScannerInput = () => {
      const normalized = normalizeIsbn(keyboardScanBuffer.current);
      keyboardScanBuffer.current = "";

      if (normalized.length < 10) {
        return;
      }

      setManualIsbn(normalized);
      setStatus("USB scanner detected. Fetching metadata...");
      setError("");
      void populateByIsbn(normalized);
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const now = Date.now();

      if (event.key === "Enter" || event.key === "Tab") {
        if (keyboardScanBuffer.current.length >= 8) {
          event.preventDefault();
          finalizeScannerInput();
        }

        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      const character = event.key.toUpperCase();
      if (!/[0-9X]/.test(character)) {
        keyboardScanBuffer.current = "";
        return;
      }

      if (now - keyboardLastTimestamp.current > 75) {
        keyboardScanBuffer.current = character;
      } else {
        keyboardScanBuffer.current += character;
      }

      keyboardLastTimestamp.current = now;

      if (keyboardScanBuffer.current.length >= 13) {
        finalizeScannerInput();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [populateByIsbn]);

  return (
    <main className="app-shell">
      <header className="header">
        <h1>APSLibros</h1>
        <p>Scan an ISBN barcode and automatically create your book record.</p>
      </header>

      <section className="layout">
        <article className="card">
          <h2>ISBN Capture</h2>
          <div className="row" style={{ marginBottom: "0.75rem" }}>
            <button type="button" onClick={() => setScanEnabled((value) => !value)} className="secondary">
              {scanEnabled ? "Pause scanner" : "Start scanner"}
            </button>
          </div>

          <IsbnScanner
            enabled={scanEnabled}
            onDetected={(value) => {
              setManualIsbn(value);
              void populateByIsbn(value);
            }}
            onError={setError}
          />

          <div className="row" style={{ marginTop: "1rem" }}>
            <input
              value={manualIsbn}
              placeholder="Type ISBN-10 or ISBN-13"
              onChange={(event) => setManualIsbn(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleManualLookup();
                }
              }}
              aria-label="ISBN input"
            />
            <button type="button" onClick={() => void handleManualLookup()} disabled={loading}>
              {loading ? "Looking up..." : "Lookup"}
            </button>
          </div>

          <p className="help-text" style={{ marginTop: "0.75rem" }}>
            USB barcode scanner: connect scanner, click anywhere outside text fields, then scan the barcode.
          </p>

          {status && !error ? <p className="status">{status}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </article>

        <article className="card">
          <h2>Book Record</h2>
          <div className="form-grid">
            <label>
              ISBN
              <input value={book.isbn} readOnly />
            </label>
            <label>
              Title
              <input value={book.title} readOnly />
            </label>
            <label>
              Author
              <input value={book.author} readOnly />
            </label>
            <label>
              Publisher
              <input value={book.publisher} readOnly />
            </label>
            <label>
              Publication year
              <input value={book.year} readOnly />
            </label>
          </div>
        </article>
      </section>
    </main>
  );
}
