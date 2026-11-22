/** Best effort: a quick location fix if the phone allows it; never blocks the form. */
export function locate(): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), 4000);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        clearTimeout(t);
        resolve({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => {
        clearTimeout(t);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 3500, maximumAge: 60000 },
    );
  });
}
