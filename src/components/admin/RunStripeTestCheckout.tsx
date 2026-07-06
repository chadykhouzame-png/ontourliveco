import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function RunStripeTestCheckout() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-test-checkout");
      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned");
      window.open(data.url, "_blank", "noopener,noreferrer");
      toast({
        title: "Test checkout opened",
        description:
          "Complete it with card 4242 4242 4242 4242. Stripe will fire checkout.session.completed to your webhook.",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create test checkout";
      toast({ title: "Could not start test checkout", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Run Stripe test checkout
        </CardTitle>
        <CardDescription>
          Creates a $1 Stripe Checkout session in Test mode. Completing it triggers a real
          <span className="font-mono"> checkout.session.completed </span>
          event to your webhook endpoint. Requires <span className="font-mono">STRIPE_SECRET_KEY</span> to be a test key (<span className="font-mono">sk_test_…</span>).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleClick} disabled={loading}>
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating session…</>
          ) : (
            <><ExternalLink className="mr-2 h-4 w-4" /> Open test checkout</>
          )}
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          Use test card <span className="font-mono">4242 4242 4242 4242</span>, any future expiry, any CVC. After completing, refresh the Webhook Events table above.
        </p>
      </CardContent>
    </Card>
  );
}
