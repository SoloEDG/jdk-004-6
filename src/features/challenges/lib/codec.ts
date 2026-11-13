import type { ChallengeConfig } from "../../../shared/types";
import { isSupportedRuleVersion } from "../../../shared/rules";
import { base64UrlDecode, base64UrlEncode, fnv1aHex } from "./encoding";
import { validateChallengeShape } from "./config";

const PREFIX = "VS1";

export type DecodeStatus = "ok" | "corrupt" | "unsupported";

export interface DecodeSuccess {
  status: "ok";
  challenge: ChallengeConfig;
}
export interface DecodeFailure {
  status: "corrupt" | "unsupported";
  reason: string;
}
export type DecodeResult = DecodeSuccess | DecodeFailure;

/** Encode a challenge into a portable, self-checking share code. */
export function encodeChallenge(challenge: ChallengeConfig): string {
  const payload = base64UrlEncode(JSON.stringify(challenge));
  const checksum = fnv1aHex(payload);
  return `${PREFIX}.${payload}.${checksum}`;
}

/**
 * Decode a share code.
 * - "corrupt": malformed text, failed checksum or unparseable/non-conforming JSON.
 *   The caller must keep the current run untouched.
 * - "unsupported": well-formed code whose rulesVersion this build cannot run.
 */
export function decodeChallenge(input: string): DecodeResult {
  const text = input.trim();
  const parts = text.split(".");
  if (parts.length !== 3 || parts[0] !== PREFIX)
    return { status: "corrupt", reason: "挑战码格式不正确，应类似 VS1.xxxx.xxxx" };
  const [, payload, checksum] = parts;
  if (fnv1aHex(payload) !== checksum.toLowerCase())
    return { status: "corrupt", reason: "校验和不匹配，挑战码可能已损坏或被改动" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(base64UrlDecode(payload));
  } catch {
    return { status: "corrupt", reason: "挑战码内容无法解析" };
  }
  if (!validateChallengeShape(parsed))
    return { status: "corrupt", reason: "挑战码字段缺失或超出允许范围" };
  if (!isSupportedRuleVersion(parsed.rulesVersion))
    return {
      status: "unsupported",
      reason: `当前客户端不支持规则版本 ${parsed.rulesVersion}，请更新后再接入`,
    };
  return { status: "ok", challenge: parsed };
}
