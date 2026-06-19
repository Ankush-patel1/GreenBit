import React, { useEffect, useRef, useId } from "react"
import { X } from "lucide-react"
import { cn } from "../../utils/cn"
import { Button } from "./Button"

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl"
  footer?: React.ReactNode
}

const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Accessible modal dialog component.
 * - Traps focus within modal when open (WCAG 2.1 SC 2.1.2)
 * - Closes on Escape key press
 * - Has role="dialog", aria-modal, aria-labelledby
 * - Restores focus to trigger element on close
 * - Prevents background scroll
 */
export const Modal = ({ isOpen, onClose, title, children, size = "md", footer }: ModalProps) => {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  // Track previously focused element to restore focus on close
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    // Store previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
        return
      }

      // Focus trap: intercept Tab and Shift+Tab
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
        ).filter(el => !el.closest("[hidden]"))

        if (focusable.length === 0) {
          e.preventDefault()
          return
        }

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey) {
          // Shift+Tab: if on first element, wrap to last
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          // Tab: if on last element, wrap to first
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)

    // Focus first focusable element in modal
    requestAnimationFrame(() => {
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      if (focusable && focusable.length > 0) {
        focusable[0].focus()
      }
    })

    return () => {
      document.body.style.overflow = "unset"
      window.removeEventListener("keydown", handleKeyDown)
      // Restore focus to previously focused element
      previousFocusRef.current?.focus()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      aria-hidden="false"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-brand-forest/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          "relative bg-white rounded-xl shadow-2xl border border-brand-forest/10 flex flex-col w-full max-h-[90vh] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200",
          {
            "max-w-sm": size === "sm",
            "max-w-md": size === "md",
            "max-w-lg": size === "lg",
            "max-w-2xl": size === "xl",
          }
        )}
      >
        {/* Header */}
        <div className="p-5 border-b border-brand-forest/5 flex items-center justify-between">
          {title ? (
            <h3 id={titleId} className="font-heading text-lg font-bold text-brand-forest">
              {title}
            </h3>
          ) : (
            <div />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 rounded-full text-brand-forest/40 hover:text-brand-forest"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto font-body text-sm text-brand-forest/80 flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-brand-forest/5 bg-brand-chalk/30 flex items-center justify-end space-x-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
