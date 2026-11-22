/**
 * Link that opens the phone's own maps app at a point. Apple devices get Apple Maps (opens the Maps app
 * rather than a web page in a Safari sheet over the installed app); everyone else gets Google Maps.
 */
export function mapsHref(lat: number, lng: number, label: string, userAgent: string | null): string {
  const apple = /iPhone|iPad|iPod|Macintosh/.test(userAgent ?? "");
  return apple
    ? `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(label)}`
    : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
