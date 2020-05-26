import * as mimes from 'mime-types';

export class Base64 {
	public static base64ToArrayBuffer(base64: string): ArrayBuffer {
		const binaryString = window.atob(base64);
		const len = binaryString.length;
		const bytes = new Uint8Array(len);
		for (let i = 0; i < len; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}
		return bytes.buffer as ArrayBuffer;
	}

	public static arrayBufferToBase64(
		buffer: ArrayBuffer,
		fileName: string,
	): string {
		let binary = '';
		const bytes = new Uint8Array(buffer);
		const len = bytes.byteLength;

		for (let i = 0; i < len; i++) {
			binary += String.fromCharCode(bytes[i]);
		}

		return `data:${mimes.lookup(fileName)};base64,${window.btoa(binary)}`;
	}
}
