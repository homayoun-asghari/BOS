import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FeatureItem {
  text: string;
  included: boolean;
}

interface PricingCardProps {
  title: string;
  price: string;
  description: string;
  features: FeatureItem[];
  isPopular?: boolean;
  buttonText: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive" | null | undefined;
  onButtonClick: () => void;
}

export function PricingCard({
  title,
  price,
  description,
  features,
  isPopular = false,
  buttonText,
  buttonVariant = "default",
  onButtonClick,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col p-6 bg-card rounded-xl border shadow-sm transition-all hover:shadow-md",
        isPopular && "border-primary ring-2 ring-primary/20",
        "hover:ring-1 hover:ring-primary/20"
      )}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
          Most Popular
        </div>
      )}
      
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold mb-1">{title}</h3>
        <div className="flex items-baseline justify-center gap-2 mb-2">
          <span className="text-3xl font-bold">{price}</span>
          <span className="text-muted-foreground text-sm">/month</span>
        </div>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            {feature.included ? (
              <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
            ) : (
              <X className="h-5 w-5 text-muted-foreground/50 mr-2 mt-0.5 flex-shrink-0" />
            )}
            <span className={cn("text-sm", !feature.included && "text-muted-foreground/70")}>
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      <Button 
        size="lg" 
        className="w-full mt-auto"
        variant={buttonVariant}
        onClick={onButtonClick}
      >
        {buttonText}
      </Button>
    </div>
  );
}
