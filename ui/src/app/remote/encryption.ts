
export class Encryption {
  private readonly enc = new TextEncoder();
  private readonly dec = new TextDecoder();


  static async hashString(message: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return this.hexString(hash);
  }


  async encryptData(secretData: string, password: string): Promise<string> {
    try {
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const passwordKey = await this.getPasswordKey(password);
      const aesKey = await this.deriveKey(passwordKey, salt, ["encrypt"]);
      const encryptedContent = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        aesKey,
        this.enc.encode(secretData)
      );

      const encryptedContentArr = new Uint8Array(encryptedContent);
      let buff = new Uint8Array(
        salt.byteLength + iv.byteLength + encryptedContentArr.byteLength
      );
      buff.set(salt, 0);
      buff.set(iv, salt.byteLength);
      buff.set(encryptedContentArr, salt.byteLength + iv.byteLength);
      const base64Buff = this.buff_to_base64(buff);
      return base64Buff;
    } catch (e) {
      console.log(`Error - ${e}`);
      return "";
    }
  }


  async decryptData(encryptedData: string, password: string): Promise<string> {
    try {
      const encryptedDataBuff = this.base64_to_buf(encryptedData);
      const salt = encryptedDataBuff.slice(0, 16);
      const iv = encryptedDataBuff.slice(16, 16 + 12);
      const data = encryptedDataBuff.slice(16 + 12);
      const passwordKey = await this.getPasswordKey(password);
      const aesKey = await this.deriveKey(passwordKey, salt, ["decrypt"]);
      const decryptedContent = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        aesKey,
        data
      );
      return this.dec.decode(decryptedContent);
    } catch (e) {
      console.log(`Error - ${e}`);
      return "";
    }
  }


  private static hexString(buffer: ArrayBuffer) {
    const byteArray = new Uint8Array(buffer);
    const hexCodes = [...byteArray].map(value => {
      const hexCode = value.toString(16);
      return hexCode.padStart(2, '0');
    });
    return hexCodes.join('');
  }


  private buff_to_base64(buff: Iterable<number>): string {
    return btoa(
      new Uint8Array(buff).reduce(
        (data, byte) => data + String.fromCharCode(byte), ''
      )
    );
  }


  private base64_to_buf(b64: string): Uint8Array {
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(null));
  }


  private getPasswordKey(password: string): Promise<CryptoKey> {
    return window.crypto.subtle.importKey("raw", this.enc.encode(password), "PBKDF2", false, [
      "deriveKey",
    ]);
  }


  private deriveKey(passwordKey: CryptoKey, salt: any, keyUsage: KeyUsage[]): Promise<CryptoKey> {
    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 250000,
        hash: "SHA-256",
      },
      passwordKey,
      { name: "AES-GCM", length: 256 },
      false,
      keyUsage
    );
  }

}