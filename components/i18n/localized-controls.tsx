"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { useUi } from "./use-ui";

// Translate interface attributes only. Values, files, handlers and refs pass through.
function useAttributes<T extends { placeholder?: string; title?: string; "aria-label"?: string }>(props: T) {
  const tr = useUi();
  return { ...props, placeholder: props.placeholder ? tr(props.placeholder) : props.placeholder, title: props.title ? tr(props.title) : props.title, "aria-label": props["aria-label"] ? tr(props["aria-label"]) : props["aria-label"] };
}
export const LocalizedInput = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>((props, ref) => <input ref={ref} {...useAttributes(props)} />);
export const LocalizedTextarea = forwardRef<HTMLTextAreaElement, ComponentPropsWithoutRef<"textarea">>((props, ref) => <textarea ref={ref} {...useAttributes(props)} />);
export const LocalizedButton = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<"button">>((props, ref) => <button ref={ref} {...useAttributes(props)} />);
LocalizedInput.displayName = "LocalizedInput";
LocalizedTextarea.displayName = "LocalizedTextarea";
LocalizedButton.displayName = "LocalizedButton";
