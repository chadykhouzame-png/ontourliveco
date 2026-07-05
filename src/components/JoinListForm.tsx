import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2 } from "lucide-react";

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().trim().email("Enter a valid email").max(255, "Email is too long"),
  message: z.string().trim().max(2000, "Message is too long").optional(),
  signup_type: z.enum(["join_list", "request_stage"]),
});

type SignupType = "join_list" | "request_stage";

const JoinListForm = () => {
  const { toast } = useToast();
  const [signupType, setSignupType] = useState<SignupType>("join_list");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse({ name, email, message: message || undefined, signup_type: signupType });
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      toast({ title: "Check your details", description: first ?? "Please review the form", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("waitlist_signups").insert({
      name: parsed.data.name,
      email: parsed.data.email,
      message: parsed.data.message ?? null,
      signup_type: parsed.data.signup_type,
    });
    setSubmitting(false);

    if (error) {
      toast({ title: "Something went wrong", description: error.message, variant: "destructive" });
      return;
    }
    setSuccess(true);
  };

  const reset = () => {
    setSuccess(false);
    setName("");
    setEmail("");
    setMessage("");
  };

  if (success) {
    return (
      <div className="rounded-brand border border-champagne/40 bg-noir-lift p-10 text-center">
        <div className="mx-auto mb-6 w-14 h-14 rounded-full border border-champagne flex items-center justify-center">
          <Check className="w-6 h-6 text-champagne" />
        </div>
        <p className="eyebrow mb-3">You're on the list</p>
        <h3 className="font-display uppercase tracking-display text-ivory text-2xl md:text-3xl mb-3">
          The stage is set.
        </h3>
        <p className="editorial text-lg mb-6">A quiet welcome — we'll be in touch.</p>
        <p className="text-smoke text-sm max-w-md mx-auto mb-8">
          {signupType === "request_stage"
            ? "We received your request. Our team will reach out to line up your first dates."
            : "You'll hear from us when the doors open in your city."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="text-sm text-smoke hover:text-champagne underline-offset-4 hover:underline transition-colors"
        >
          Submit another →
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-brand border border-border bg-noir-lift p-6 md:p-10 space-y-6"
    >
      {/* Type toggle */}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-brand border border-border">
        {(
          [
            { value: "join_list", label: "Join the list" },
            { value: "request_stage", label: "Request the stage" },
          ] as const
        ).map((opt) => {
          const active = signupType === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSignupType(opt.value)}
              className={`text-xs uppercase tracking-label py-2.5 rounded-brand transition-colors ${
                active
                  ? "bg-champagne text-noir"
                  : "text-smoke hover:text-ivory"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name" className="eyebrow">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          required
          placeholder="Your full name"
          className="bg-transparent border-border rounded-brand text-ivory"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="eyebrow">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={255}
          required
          placeholder="you@stage.co"
          className="bg-transparent border-border rounded-brand text-ivory"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message" className="eyebrow">
          {signupType === "request_stage" ? "Tell us about your act" : "A note (optional)"}
        </Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder={
            signupType === "request_stage"
              ? "Genre, cities, dates — what stage are you chasing?"
              : "Anything you'd like us to know."
          }
          className="bg-transparent border-border rounded-brand text-ivory resize-none"
        />
      </div>

      <Button
        type="submit"
        disabled={submitting}
        size="lg"
        className="w-full bg-champagne text-noir hover:bg-champagne-deep hover:text-ivory rounded-brand uppercase tracking-[0.08em] font-semibold shadow-none"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Sending…
          </>
        ) : signupType === "request_stage" ? (
          "Request the stage"
        ) : (
          "Join the list"
        )}
      </Button>

      <p className="text-xs text-smoke text-center">
        By submitting you agree we can contact you about On Tour Live.
      </p>
    </form>
  );
};

export default JoinListForm;
