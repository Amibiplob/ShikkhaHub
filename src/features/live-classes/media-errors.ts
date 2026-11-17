export type MediaKind = "audio" | "video";
export function mediaError(error: unknown) {
  const name = error instanceof DOMException || error instanceof Error ? error.name : "";
  if (name === "NotAllowedError")
    return "Permission denied. Allow the requested device in browser settings and retry.";
  if (name === "NotFoundError")
    return "Device unavailable. Connect a microphone or camera and retry.";
  if (name === "NotReadableError")
    return "Device is busy or disconnected. Close other apps using it and retry.";
  if (name === "OverconstrainedError")
    return "Device settings unavailable. Choose another input or the default device and retry.";
  if (["SecurityError", "NotSupportedError", "TypeError"].includes(name))
    return "Device capture is unavailable in this browser. You can still join without devices.";
  return error instanceof Error
    ? error.message
    : "Media unavailable. Check your devices and retry.";
}

