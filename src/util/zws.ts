import { randomBytes } from "crypto";

/**
 * Credits to aetheryx (https://github.com/aetheryx/sharex-upload-server) for the original function.
 */
export function zws(number: number) {
  const zeroWidthCap = "\u200B";
  const zeroWidthChars = [zeroWidthCap, "\u200C", "\u200D", "\u2060", "\u180E"];

  return [...randomBytes(number)]
      .map((byte) => zeroWidthChars[+byte % zeroWidthChars.length])
      .join("")
      .slice(1) + zeroWidthCap;
}
