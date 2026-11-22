/** Shrinks a camera photo to ≤1600px JPEG on the phone before upload (yards have poor signal). Browser only. */
export async function shrinkPhoto(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("resize"))), "image/jpeg", 0.82));
    return new File([blob], "photo.jpg", { type: "image/jpeg" });
  } catch {
    return file; // format the canvas can't read: send as-is, the server checks type and size
  }
}
