/** Security settings (docs/05). Kept in one place so they're easy to review and change. */
export const LOCKOUT = { maxFailures: 5, windowMinutes: 15 } as const;
export const PIN = { min: 4, max: 6, maxFailures: 5 } as const;
/** A phone with a PIN or passkey asks for it again after this long without use. */
export const UNLOCK_IDLE_HOURS = 12;
/** User types that need a second step (emailed/SMS code) on a new device. */
export const SECOND_STEP_TYPES = ["director", "office"] as const;

export function isLockedOut(recentFailures: number) {
  return recentFailures >= LOCKOUT.maxFailures;
}

export function validPin(pin: string) {
  return new RegExp(`^\\d{${PIN.min},${PIN.max}}$`).test(pin) && !/^(\d)\1+$/.test(pin) && !"0123456789".includes(pin) && !"9876543210".includes(pin);
}

export function needsSecondStep(userType: string | null) {
  return userType !== null && (SECOND_STEP_TYPES as readonly string[]).includes(userType);
}
