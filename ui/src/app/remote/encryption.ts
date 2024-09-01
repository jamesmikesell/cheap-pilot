
export class Encryption {
  private readonly enc = new TextEncoder();
  private readonly dec = new TextDecoder();


  static async hashString(message: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return this.hexString(hash);
  }


  private async compress(uncompressed: Uint8Array, method: "deflate" | "gzip" | "deflate-raw"): Promise<ArrayBuffer> {
    const stream = new window.CompressionStream(method);
    const writer = stream.writable.getWriter();

    void writer.write(uncompressed);
    void writer.close();

    const compressedArrayBuffer = await new Response(stream.readable).arrayBuffer();

    return compressedArrayBuffer;
  }


  private async decompress(compressed: ArrayBuffer, method: "deflate" | "gzip" | "deflate-raw"): Promise<ArrayBuffer> {
    const decompressionStream = new window.DecompressionStream(method);
    const inputStream = new Response(compressed).body;
    const decompressedStream = inputStream.pipeThrough(decompressionStream);
    const decompressedArrayBuffer = await new Response(decompressedStream).arrayBuffer();

    return decompressedArrayBuffer;
  }


  async encryptData(secretData: string, password: string): Promise<Uint8Array> {
    try {
      let compressed = await this.compress(this.enc.encode(secretData), "deflate-raw");
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
        compressed
      );

      const encryptedContentArr = new Uint8Array(encryptedContent);
      let buff = new Uint8Array(
        salt.byteLength + iv.byteLength + encryptedContentArr.byteLength
      );
      buff.set(salt, 0);
      buff.set(iv, salt.byteLength);
      buff.set(encryptedContentArr, salt.byteLength + iv.byteLength);
      return buff
    } catch (e) {
      console.log("Error", e);
      return undefined;
    }
  }


  async decryptData(encryptedData: Uint8Array, password: string): Promise<string> {
    try {
      const encryptedDataBuff = encryptedData;
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

      let decompressed = await this.decompress(decryptedContent, "deflate-raw");
      return this.dec.decode(decompressed)
    } catch (e) {
      console.log("Error", e);
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


  private getPasswordKey(password: string): Promise<CryptoKey> {
    return window.crypto.subtle.importKey("raw", this.enc.encode(password), "PBKDF2", false, [
      "deriveKey",
    ]);
  }


  private deriveKey(passwordKey: CryptoKey, salt: any, keyUsage: KeyUsage[]): Promise<CryptoKey> {
    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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