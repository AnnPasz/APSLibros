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
  category: string;
};

type LibraryBook = BookForm & {
  id: string;
};

const categories = ["Kryminał", "Romans", "Fantastyka", "Literatura faktu", "Biografia", "Dla dzieci", "Inne"];

const emptyBook: BookForm = {
  isbn: "",
  title: "",
  author: "",
  publisher: "",
  year: "",
  category: "Inne"
};

const libraryStorageKey = "apslibros-library";

export default function App() {
  const [manualIsbn, setManualIsbn] = useState("");
  const [book, setBook] = useState<BookForm>(emptyBook);
  const [library, setLibrary] = useState<LibraryBook[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<BookForm>(emptyBook);
  const [scanEnabled, setScanEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Gotowe do skanowania lub wpisania ISBN.");
  const [error, setError] = useState("");
  const keyboardScanBuffer = useRef("");
  const keyboardLastTimestamp = useRef(0);

  const effectiveIsbn = useMemo(() => normalizeIsbn(manualIsbn), [manualIsbn]);

  const populateByIsbn = useCallback(async (isbnValue: string) => {
    setLoading(true);
    setError("");
    setStatus("Pobieram metadane z Open Library...");

    try {
      const metadata = await fetchBookByIsbn(isbnValue);
      setBook((currentBook) => ({ ...metadata, category: currentBook.category || "Inne" }));
      setManualIsbn(metadata.isbn);
      setStatus("Dane książki zostały uzupełnione.");
      setScanEnabled(false);
    } catch (lookupError) {
      const message = lookupError instanceof Error ? lookupError.message : "Nieoczekiwany błąd wyszukiwania ISBN.";
      setError(message);
      setStatus("Czekam na kolejny ISBN...");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const rawData = localStorage.getItem(libraryStorageKey);
    if (!rawData) {
      return;
    }

    try {
      const parsed = JSON.parse(rawData) as LibraryBook[];
      if (Array.isArray(parsed)) {
        setLibrary(parsed);
      }
    } catch {
      setLibrary([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(libraryStorageKey, JSON.stringify(library));
  }, [library]);

  const handleManualLookup = async () => {
    if (!effectiveIsbn) {
      setError("Najpierw wpisz ISBN.");
      return;
    }

    await populateByIsbn(effectiveIsbn);
  };

  const handleAddToLibrary = () => {
    if (!book.isbn || !book.title) {
      setError("Aby dodać książkę, najpierw pobierz dane po ISBN.");
      return;
    }

    const newBook: LibraryBook = {
      ...book,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    };

    setLibrary((currentLibrary) => [newBook, ...currentLibrary]);
    setStatus(`Dodano do biblioteki: ${book.title}`);
    setError("");
  };

  const startEditing = (entry: LibraryBook) => {
    setEditingId(entry.id);
    setEditingDraft({
      isbn: entry.isbn,
      title: entry.title,
      author: entry.author,
      publisher: entry.publisher,
      year: entry.year,
      category: entry.category || "Inne"
    });
  };

  const saveEditing = () => {
    if (!editingId) {
      return;
    }

    setLibrary((currentLibrary) =>
      currentLibrary.map((entry) =>
        entry.id === editingId
          ? {
              ...entry,
              isbn: normalizeIsbn(editingDraft.isbn),
              title: editingDraft.title,
              author: editingDraft.author,
              publisher: editingDraft.publisher,
              year: editingDraft.year,
              category: editingDraft.category
            }
          : entry
      )
    );
    setEditingId(null);
    setStatus("Zmiany w książce zostały zapisane.");
  };

  const deleteEntry = (id: string) => {
    setLibrary((currentLibrary) => currentLibrary.filter((entry) => entry.id !== id));
    if (editingId === id) {
      setEditingId(null);
    }
    setStatus("Książka została usunięta z biblioteki.");
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
      setStatus("Wykryto skaner USB. Pobieram metadane...");
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
        <p>Zeskanuj ISBN i automatycznie uzupełnij rekord książki.</p>
      </header>

      <section className="layout">
        <article className="card">
          <h2>Skanowanie ISBN</h2>
          <div className="row" style={{ marginBottom: "0.75rem" }}>
            <button type="button" onClick={() => setScanEnabled((value) => !value)} className="secondary">
              {scanEnabled ? "Wstrzymaj skaner" : "Uruchom skaner"}
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
              placeholder="Wpisz ISBN-10 lub ISBN-13"
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
              {loading ? "Szukam..." : "Wyszukaj"}
            </button>
          </div>

          <p className="help-text" style={{ marginTop: "0.75rem" }}>
            Skaner USB: podłącz urządzenie, kliknij poza polem tekstowym i zeskanuj kod.
          </p>

          {status && !error ? <p className="status">{status}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </article>

        <article className="card">
          <h2>Rekord książki</h2>
          <div className="form-grid">
            <label>
              ISBN
              <input value={book.isbn} readOnly />
            </label>
            <label>
              Tytuł
              <input value={book.title} readOnly />
            </label>
            <label>
              Autor
              <input value={book.author} readOnly />
            </label>
            <label>
              Wydawnictwo
              <input value={book.publisher} readOnly />
            </label>
            <label>
              Rok wydania
              <input value={book.year} readOnly />
            </label>
            <label>
              Kategoria
              <select
                value={book.category}
                onChange={(event) => setBook((currentBook) => ({ ...currentBook, category: event.target.value }))}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="row" style={{ marginTop: "0.9rem" }}>
            <button type="button" onClick={handleAddToLibrary} className="secondary">
              Dodaj do biblioteki
            </button>
          </div>
        </article>
      </section>

      <section className="card" style={{ marginTop: "1rem" }}>
        <h2>Moja biblioteka</h2>

        {library.length === 0 ? <p className="help-text">Brak zapisanych książek. Zeskanuj ISBN i dodaj pierwszą pozycję.</p> : null}

        <div className="library-list">
          {library.map((entry) => {
            const isEditing = editingId === entry.id;

            return (
              <article key={entry.id} className="library-item">
                <div className="library-fields">
                  <label>
                    ISBN
                    <input
                      value={isEditing ? editingDraft.isbn : entry.isbn}
                      onChange={(event) => setEditingDraft((draft) => ({ ...draft, isbn: event.target.value }))}
                      readOnly={!isEditing}
                    />
                  </label>
                  <label>
                    Tytuł
                    <input
                      value={isEditing ? editingDraft.title : entry.title}
                      onChange={(event) => setEditingDraft((draft) => ({ ...draft, title: event.target.value }))}
                      readOnly={!isEditing}
                    />
                  </label>
                  <label>
                    Autor
                    <input
                      value={isEditing ? editingDraft.author : entry.author}
                      onChange={(event) => setEditingDraft((draft) => ({ ...draft, author: event.target.value }))}
                      readOnly={!isEditing}
                    />
                  </label>
                  <label>
                    Wydawnictwo
                    <input
                      value={isEditing ? editingDraft.publisher : entry.publisher}
                      onChange={(event) => setEditingDraft((draft) => ({ ...draft, publisher: event.target.value }))}
                      readOnly={!isEditing}
                    />
                  </label>
                  <label>
                    Rok wydania
                    <input
                      value={isEditing ? editingDraft.year : entry.year}
                      onChange={(event) => setEditingDraft((draft) => ({ ...draft, year: event.target.value }))}
                      readOnly={!isEditing}
                    />
                  </label>
                  <label>
                    Kategoria
                    {isEditing ? (
                      <select
                        value={editingDraft.category}
                        onChange={(event) => setEditingDraft((draft) => ({ ...draft, category: event.target.value }))}
                      >
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input value={entry.category} readOnly />
                    )}
                  </label>
                </div>

                <div className="row library-actions">
                  {isEditing ? (
                    <>
                      <button type="button" onClick={saveEditing}>
                        Zapisz
                      </button>
                      <button type="button" className="secondary" onClick={() => setEditingId(null)}>
                        Anuluj
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => startEditing(entry)}>
                      Edytuj
                    </button>
                  )}
                  <button type="button" className="danger" onClick={() => deleteEntry(entry.id)}>
                    Usuń
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
