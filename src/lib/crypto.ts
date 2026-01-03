/**
 * Web Crypto API 加密工具
 * 使用 AES-GCM 對稱加密保護敏感資料
 */

const ENCRYPTION_KEY_NAME = "obsidian-web-encryption-key";
const ALGORITHM = "AES-GCM";

// 生成或取得加密金鑰
async function getOrCreateKey(): Promise<CryptoKey> {
  // 嘗試從 IndexedDB 取得現有金鑰
  const existingKey = await getKeyFromStorage();
  if (existingKey) {
    return existingKey;
  }

  // 生成新的加密金鑰
  const key = await crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: 256,
    },
    true, // 可匯出以便儲存
    ["encrypt", "decrypt"]
  );

  // 儲存金鑰到 IndexedDB
  await saveKeyToStorage(key);
  return key;
}

// 從 IndexedDB 取得金鑰
function getKeyFromStorage(): Promise<CryptoKey | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open("obsidian-web-crypto", 1);

    request.onerror = () => resolve(null);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("keys")) {
        db.createObjectStore("keys");
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      try {
        const transaction = db.transaction("keys", "readonly");
        const store = transaction.objectStore("keys");
        const getRequest = store.get(ENCRYPTION_KEY_NAME);

        getRequest.onsuccess = async () => {
          if (getRequest.result) {
            try {
              // 從 JWK 格式匯入金鑰
              const key = await crypto.subtle.importKey(
                "jwk",
                getRequest.result,
                { name: ALGORITHM, length: 256 },
                true,
                ["encrypt", "decrypt"]
              );
              resolve(key);
            } catch {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        };

        getRequest.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    };
  });
}

// 儲存金鑰到 IndexedDB
function saveKeyToStorage(key: CryptoKey): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      // 匯出金鑰為 JWK 格式
      const exportedKey = await crypto.subtle.exportKey("jwk", key);

      const request = indexedDB.open("obsidian-web-crypto", 1);

      request.onerror = () => reject(new Error("Failed to open IndexedDB"));

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("keys")) {
          db.createObjectStore("keys");
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction("keys", "readwrite");
        const store = transaction.objectStore("keys");
        const putRequest = store.put(exportedKey, ENCRYPTION_KEY_NAME);

        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(new Error("Failed to save key"));
      };
    } catch (error) {
      reject(error);
    }
  });
}

// 將 ArrayBuffer 轉換為 Base64 字串
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// 將 Base64 字串轉換為 ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * 加密資料
 * @param data 要加密的字串
 * @returns 加密後的 Base64 字串（包含 IV）
 */
export async function encrypt(data: string): Promise<string> {
  try {
    const key = await getOrCreateKey();
    
    // 生成隨機初始化向量 (IV)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // 將資料編碼為 Uint8Array
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    
    // 加密資料
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      encodedData
    );
    
    // 將 IV 和加密資料合併，然後轉換為 Base64
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);
    
    return arrayBufferToBase64(combined.buffer);
  } catch (error) {
    console.error("Encryption failed");
    throw new Error("加密失敗");
  }
}

/**
 * 解密資料
 * @param encryptedData 加密的 Base64 字串
 * @returns 解密後的原始字串
 */
export async function decrypt(encryptedData: string): Promise<string> {
  try {
    const key = await getOrCreateKey();
    
    // 將 Base64 轉換回 ArrayBuffer
    const combined = new Uint8Array(base64ToArrayBuffer(encryptedData));
    
    // 分離 IV 和加密資料
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    // 解密資料
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      encrypted
    );
    
    // 將解密的資料轉換回字串
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error("Decryption failed");
    throw new Error("解密失敗");
  }
}

/**
 * 檢查資料是否已加密（用於遷移舊資料）
 * @param data 要檢查的字串
 * @returns 是否為加密格式
 */
export function isEncrypted(data: string): boolean {
  try {
    // 嘗試解析為 JSON，如果成功則為舊格式（未加密）
    JSON.parse(data);
    return false;
  } catch {
    // 如果不是有效 JSON，可能是加密資料
    // 檢查是否為有效的 Base64
    try {
      const decoded = atob(data);
      // 加密資料至少需要 12 bytes IV + 一些加密內容
      return decoded.length > 12;
    } catch {
      return false;
    }
  }
}

/**
 * 清除加密金鑰（用於完全登出）
 */
export async function clearEncryptionKey(): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.open("obsidian-web-crypto", 1);

    request.onerror = () => resolve();

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      try {
        const transaction = db.transaction("keys", "readwrite");
        const store = transaction.objectStore("keys");
        store.delete(ENCRYPTION_KEY_NAME);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve();
      } catch {
        resolve();
      }
    };
  });
}
