import type { ChallengeResult } from "../../../shared/types";

export function serializeResult(result: ChallengeResult): string {
  return JSON.stringify(result, null, 2);
}

/** Trigger a local JSON download of the exported result. */
export function downloadResult(result: ChallengeResult): string {
  const text = serializeResult(result);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `void-signal-result-${result.challenge.date}-${result.challenge.code}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  return text;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
