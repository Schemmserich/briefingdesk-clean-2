export class UserFacingAiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingAiError";
  }
}

function getErrorMessage(error: any): string {
  return String(
    error?.originalMessage ||
      error?.message ||
      ""
  ).toLowerCase();
}

function isQuotaOr429Error(error: any): boolean {
  const message = getErrorMessage(error);

  return (
    error?.code === 429 ||
    error?.status === "RESOURCE_EXHAUSTED" ||
    message.includes("429") ||
    message.includes("quota") ||
    message.includes("too many requests") ||
    message.includes("resource_exhausted") ||
    message.includes("generaterequestsperday") ||
    message.includes("free tier")
  );
}

function is503OrTemporaryError(error: any): boolean {
  const message = getErrorMessage(error);

  return (
    error?.code === 503 ||
    error?.status === "UNAVAILABLE" ||
    message.includes("503") ||
    message.includes("service unavailable") ||
    message.includes("high demand") ||
    message.includes("temporarily unavailable") ||
    message.includes("unavailable")
  );
}

export async function withAiRetry<T>(
  fn: () => Promise<T>,
  options?: {
    retries?: number;
    baseDelayMs?: number;
  }
): Promise<T> {
  const retries = options?.retries ?? 0;
  const baseDelayMs = options?.baseDelayMs ?? 1000;

  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (isQuotaOr429Error(error)) {
        throw error;
      }

      const canRetry = is503OrTemporaryError(error) && attempt < retries;

      if (!canRetry) {
        throw error;
      }

      const delay = baseDelayMs * Math.pow(2, attempt);

      console.warn(
        `AI request failed on attempt ${attempt + 1}. Retrying in ${delay} ms...`,
        error
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export function mapAiErrorToUserMessage(error: any): never {
  const message = getErrorMessage(error);

  if (
    error?.code === 429 ||
    error?.status === "RESOURCE_EXHAUSTED" ||
    message.includes("429") ||
    message.includes("quota") ||
    message.includes("too many requests") ||
    message.includes("resource_exhausted")
  ) {
    throw new UserFacingAiError(
      "Das KI-Kontingent ist aktuell ausgeschöpft. Bitte warte etwas und versuche es später erneut, oder hinterlege ein bezahltes API-Setup."
    );
  }

  if (
    error?.code === 503 ||
    error?.status === "UNAVAILABLE" ||
    message.includes("503") ||
    message.includes("service unavailable") ||
    message.includes("high demand")
  ) {
    throw new UserFacingAiError(
      "Der KI-Dienst ist aktuell überlastet. Bitte versuche es in kurzer Zeit erneut."
    );
  }

  if (
    message.includes("api key") ||
    message.includes("not valid") ||
    message.includes("expired") ||
    message.includes("forbidden")
  ) {
    throw new UserFacingAiError(
      "Die KI-Konfiguration ist aktuell nicht korrekt. Bitte prüfe API-Key und Server-Konfiguration."
    );
  }

  throw new UserFacingAiError(
    "Die Briefing-Erstellung ist aktuell fehlgeschlagen. Bitte versuche es später erneut."
  );
}