"use client"

import React from "react"

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger"
type ButtonSize = "sm" | "md" | "lg"

type ButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit" | "reset"
  fullWidth?: boolean
  className?: string
  icon?: React.ReactNode
}

export function Button( {
  variant = "primary",
  size = "md",
  children,
  onClick,
  disabled = false,
  type = "button",
  fullWidth = false,
  className = "",
  icon,
}: ButtonProps ) {
  const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"

  const variantStyles = {
    primary: "bg-primary text-white hover:bg-primary-hover active:bg-primary-active",
    secondary: "bg-muted text-foreground hover:bg-muted/80 active:bg-muted/70",
    outline: "border border-border bg-transparent hover:bg-muted active:bg-muted/70",
    ghost: "bg-transparent hover:bg-muted active:bg-muted/70",
    danger: "bg-red-500 text-white hover:bg-red-600 active:bg-red-700",
  }

  const sizeStyles = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 py-2 text-sm",
    lg: "h-12 px-6 py-3 text-base",
  }

  const widthStyles = fullWidth ? "w-full" : ""

  const disabledStyles = disabled
    ? "opacity-50 cursor-not-allowed pointer-events-none"
    : "cursor-pointer"

  return (
    <button
      type={type}
      className={`${baseStyles} ${variantStyles[ variant ]} ${sizeStyles[ size ]} ${widthStyles} ${disabledStyles} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  )
}