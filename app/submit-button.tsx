"use client";
import { useFormStatus } from "react-dom";
export default function SubmitButton({
  label = "Send sign-in link",
}: {
  label?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className="button dark full" type="submit" disabled={pending}>
      {pending ? "Please wait…" : label}
    </button>
  );
}
