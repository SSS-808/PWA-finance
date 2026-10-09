"use client";

import { Eye, EyeOff } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";

export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("h-12 pr-12 text-base", className)}
      />
      <Button
        type="button"
        variant="ghost"
        onClick={() => setVisible((current) => !current)}
        aria-label={
          visible ? en.auth.fields.hidePassword : en.auth.fields.showPassword
        }
        className="absolute top-1 right-1 size-10"
      >
        {visible ? (
          <EyeOff className="size-5" aria-hidden="true" />
        ) : (
          <Eye className="size-5" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
}
