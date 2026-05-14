export type BookMetadata = {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  year: string;
};

const isbn10Regex = /^\d{9}[\dX]$/;
const isbn13Regex = /^\d{13}$/;

export function normalizeIsbn(raw: string): string {
  return raw.toUpperCase().replace(/[^0-9X]/g, "");
}

export function isValidIsbn10(value: string): boolean {
  if (!isbn10Regex.test(value)) {
    return false;
  }

  let sum = 0;
  for (let index = 0; index < 10; index += 1) {
    const character = value[index];
    const digit = character === "X" ? 10 : Number(character);
    sum += digit * (10 - index);
  }

  return sum % 11 === 0;
}

export function isValidIsbn13(value: string): boolean {
  if (!isbn13Regex.test(value)) {
    return false;
  }

  const checksum = value
    .slice(0, 12)
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);

  const checkDigit = (10 - (checksum % 10)) % 10;
  return checkDigit === Number(value[12]);
}

export function toIsbn13(value: string): string {
  if (isValidIsbn13(value)) {
    return value;
  }

  if (!isValidIsbn10(value)) {
    throw new Error("Nieprawidłowy format ISBN.");
  }

  const base = `978${value.slice(0, 9)}`;
  const checksum = base
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  const checkDigit = (10 - (checksum % 10)) % 10;
  return `${base}${checkDigit}`;
}

function parseYear(value: string | undefined): string {
  if (!value) {
    return "";
  }

  const match = value.match(/(19|20)\d{2}/);
  return match?.[0] ?? "";
}

async function fetchFromGoogleBooks(isbn: string): Promise<Partial<BookMetadata> | null> {
  try {
    const endpoint = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { items?: Array<{ volumeInfo?: Record<string, unknown> }> };
    const volumeInfo = payload.items?.[0]?.volumeInfo;

    if (!volumeInfo) {
      return null;
    }

    const title = typeof volumeInfo.title === "string" ? volumeInfo.title : "";
    const authors = Array.isArray(volumeInfo.authors)
      ? volumeInfo.authors.filter(Boolean).join(", ")
      : "";
    const publishers = Array.isArray(volumeInfo.publishers)
      ? volumeInfo.publishers.filter(Boolean).join(", ")
      : "";
    const publishedDate = typeof volumeInfo.publishedDate === "string" ? volumeInfo.publishedDate : "";

    return {
      title,
      author: authors,
      publisher: publishers,
      year: parseYear(publishedDate)
    };
  } catch {
    return null;
  }
}

export async function fetchBookByIsbn(rawIsbn: string): Promise<BookMetadata> {
  const normalized = normalizeIsbn(rawIsbn);
  const isbn = normalized.length === 10 ? toIsbn13(normalized) : normalized;

  if (!isValidIsbn13(isbn)) {
    throw new Error("ISBN musi być poprawnym kodem ISBN-10 lub ISBN-13.");
  }

  const endpoint = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=details&format=json`;
  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error("Nie udało się połączyć z API Open Library.");
  }

  const payload = (await response.json()) as Record<string, { details?: Record<string, unknown> }>;
  const key = `ISBN:${isbn}`;
  const details = payload[key]?.details;

  if (details) {
    const title = typeof details.title === "string" ? details.title : "";
    const authors = Array.isArray(details.authors)
      ? details.authors
          .map((item) => {
            if (item && typeof item === "object" && "name" in item && typeof item.name === "string") {
              return item.name;
            }

            return "";
          })
          .filter(Boolean)
          .join(", ")
      : "";

    const publishers = Array.isArray(details.publishers)
      ? details.publishers
          .map((item) => {
            if (item && typeof item === "object" && "name" in item && typeof item.name === "string") {
              return item.name;
            }

            return "";
          })
          .filter(Boolean)
          .join(", ")
      : "";

    const publishDate = typeof details.publish_date === "string" ? details.publish_date : "";

    return {
      isbn,
      title,
      author: authors,
      publisher: publishers,
      year: parseYear(publishDate)
    };
  }

  const googleBooksData = await fetchFromGoogleBooks(isbn);
  if (googleBooksData) {
    return {
      isbn,
      title: googleBooksData.title ?? "",
      author: googleBooksData.author ?? "",
      publisher: googleBooksData.publisher ?? "",
      year: googleBooksData.year ?? ""
    };
  }

  return {
    isbn,
    title: "",
    author: "",
    publisher: "",
    year: ""
  };
}
