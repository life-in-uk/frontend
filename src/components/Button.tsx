import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "primary" | "secondary";
};

// Slot preserves the child's native link semantics without nesting interactive elements.
export function Button({
  asChild = false,
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return (
    <Component className={`button button-${variant} ${className}`} {...props} />
  );
}
