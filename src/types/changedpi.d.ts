// changedpi ships no type declarations. It rewrites the PNG/JPEG `pHYs` chunk so
// the image carries a DPI tag — used to mark exported cards as 300 DPI.
declare module 'changedpi' {
  export function changeDpiDataUrl(base64Image: string, dpi: number): string
  export function changeDpiBlob(blob: Blob, dpi: number): Promise<Blob>
}
