/**
 * Credits to aetheryx (https://github.com/aetheryx/sharex-upload-server) for this function.
 */
import crypto from "crypto";
export function zws(number: number) {
  let zwsToken;
  const { randomBytes } = require("crypto");
  const zeroWidthCap = "\u200B";
  const zeroWidthChars = [zeroWidthCap, "\u200C", "\u200D", "\u2060", "\u180E"];
  zwsToken =
    [...randomBytes(number)]
      .map((byte) => zeroWidthChars[+byte % zeroWidthChars.length])
      .join("")
      .slice(1) + zeroWidthCap;
  return zwsToken;
}
