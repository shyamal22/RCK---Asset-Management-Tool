"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/** shadcn/ui Switch, sized for gloves: 56×32 track, indigo when on, tangerine focus ring. */
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-8 w-14 shrink-0 items-center rounded-full border-2 border-transparent shadow-xs transition-colors outline-none",
        "focus-visible:ring-[3px] focus-visible:ring-[var(--tangerine)]/60 disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-[var(--indigo)] data-[state=unchecked]:bg-input",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-7 rounded-full bg-white shadow-[0_2px_6px_rgba(11,11,16,.3)] ring-0 transition-transform duration-200 ease-[cubic-bezier(.2,.8,.2,1)] data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-0"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
