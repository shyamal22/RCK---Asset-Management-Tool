/** True on an iPhone/iPad when the page is NOT running as the installed home-screen app. */
export function inBrowserOnIos(nav: { userAgent: string; standalone?: boolean; maxTouchPoints?: number }, standaloneMedia: boolean): boolean {
  const ios = /iPhone|iPad|iPod/.test(nav.userAgent) || (/Macintosh/.test(nav.userAgent) && (nav.maxTouchPoints ?? 0) > 1);
  return ios && nav.standalone !== true && !standaloneMedia;
}
