import CryptoJS from "crypto-js";

export const encryptMessage = (text: string, secretKey: string): string => {
  if (!text || !secretKey) return text;
  try {
    return CryptoJS.AES.encrypt(text, secretKey).toString();
  } catch (error) {
    console.error("Encryption error:", error);
    return text; // Fallback to plaintext if error
  }
};

export const decryptMessage = (cipherText: string, secretKey: string): string => {
  if (!cipherText || !secretKey) return cipherText; // Return as is if no key
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, secretKey);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    // If decryption fails due to wrong key, decryptedText will be empty or malformed
    return decryptedText || "🔒 Decryption failed (wrong key?)";
  } catch (error) {
    // Return original cipher if simple parsing fails (or display lock icon)
    return "🔒 Encrypted Message";
  }
};
