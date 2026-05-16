import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const SAFE_ID = /^[a-zA-Z0-9_.:-]+$/;

export function createFileReceiptStore(rootDir) {
  const dir = resolve(rootDir);
  mkdirSync(dir, { recursive: true });
  return {
    dir,
    getReceipt(receiptId) {
      const filePath = receiptPath(dir, receiptId);
      if (!existsSync(filePath)) return null;
      const value = JSON.parse(readFileSync(filePath, "utf8"));
      return value && typeof value === "object" ? value : null;
    },
    saveReceipt(receipt) {
      const clean = sanitizeReceipt(receipt);
      writeFileSync(receiptPath(dir, clean.receipt_id), `${JSON.stringify(clean, null, 2)}\n`, "utf8");
      return clean;
    }
  };
}

function receiptPath(dir, receiptId) {
  const cleanId = String(receiptId || "");
  if (!SAFE_ID.test(cleanId)) throw new Error("Invalid receipt id");
  return join(dir, `${cleanId}.json`);
}

function sanitizeReceipt(receipt) {
  if (!receipt || typeof receipt !== "object") throw new Error("Receipt must be an object");
  if (!SAFE_ID.test(String(receipt.receipt_id || ""))) throw new Error("Receipt requires safe receipt_id");
  return JSON.parse(JSON.stringify(receipt));
}
