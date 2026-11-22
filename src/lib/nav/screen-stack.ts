/**
 * The in-app history this session, newest last, so "‹ Back" can tell whether the screen below the
 * current one in history is where Back should go. Kept in step with the browser's history:
 * arriving at the screen just below the top means someone went back (our Back, or the phone's back
 * gesture/button), so the top is dropped; anything else is a new screen on top.
 */
export class ScreenStack {
  private stack: string[] = [];

  visit(url: string) {
    const n = this.stack.length;
    if (this.stack[n - 1] === url) return;
    if (this.stack[n - 2] === url) this.stack.pop();
    else this.stack.push(url);
  }

  /**
   * True when stepping back in history lands somewhere Back should go: the parent screen (a list keeps
   * its filters this way), or a list this screen was opened from (Setup → Assets → a machine).
   */
  backReaches(parent: string, currentPath: string): boolean {
    const below = this.stack[this.stack.length - 2];
    if (!below) return false;
    if (parent.includes("?")) return below === parent; // first-run setup steps: exact step only
    const belowPath = below.split("?")[0];
    if (belowPath === parent) return true;
    return belowPath !== "/" && currentPath.startsWith(`${belowPath}/`);
  }
}
