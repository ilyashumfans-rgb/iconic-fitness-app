import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ArrowRight, Sparkles } from "lucide-react";

export default function Store() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-xl mx-auto animate-in fade-in duration-500">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-gradient-brand text-white shadow-[0_20px_50px_-15px_hsl(96_56%_55%/0.6)] mb-6">
          <ShoppingBag className="h-9 w-9" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-[11px] font-black tracking-[0.2em] text-primary uppercase mb-4">
          <Sparkles className="h-3 w-3" /> Store
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight">
          Coming <span className="text-gradient-brand">Soon.</span>
        </h1>
        <p className="text-muted-foreground mt-4 text-lg">
          We're building something special. Apparel, supplements, equipment and
          more — all curated for the way you train. Check back shortly.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/explore">
            <Button className="bg-gradient-brand text-white border-none font-bold h-12 px-6">
              Browse gyms <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
          <Link href="/be-a-member">
            <Button variant="outline" className="font-bold h-12 px-6">
              Become a member
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
