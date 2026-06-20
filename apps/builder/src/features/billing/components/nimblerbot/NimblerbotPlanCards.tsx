import type { Plan } from "@typebot.io/prisma/enum";
import { tierConfig } from "@typebot.io/subscriptions/tiers";
import { Badge } from "@typebot.io/ui/components/Badge";
import { Button } from "@typebot.io/ui/components/Button";
import { cn } from "@typebot.io/ui/lib/cn";
import { billingContact } from "./nimblerbotBillingConfig";

type Props = {
  currentTier: Plan;
};

type CardSpec = {
  plan: Plan;
  name: string;
  priceLabel: string;
  blurb: string;
  cta: { label: string; href: string } | null;
};

const cards: CardSpec[] = [
  {
    plan: "FREE",
    name: "Starter",
    priceLabel: "$0/mo",
    blurb: `${tierConfig.FREE.botLimit} bots · bring your own AI key`,
    cta: null,
  },
  {
    plan: "BUSINESS",
    name: "Business",
    priceLabel: `$${tierConfig.BUSINESS.priceUsd}/mo`,
    blurb: `${tierConfig.BUSINESS.botLimit} bots · included AI credit · advanced modules · priority support`,
    cta: {
      label: "Contact us",
      href: `mailto:${billingContact.salesEmail}?subject=Upgrade to Business`,
    },
  },
  {
    plan: "ENTERPRISE",
    name: "Enterprise",
    priceLabel: "Custom",
    blurb: "Unlimited bots · dedicated support · SLA · whitelabel",
    cta: {
      label: "Talk to Sales",
      href: `mailto:${billingContact.salesEmail}?subject=Enterprise plan`,
    },
  },
];

export const NimblerbotPlanCards = ({ currentTier }: Props) => (
  <div className="flex flex-col gap-4">
    <h3 className="text-xl">Plans</h3>
    <div className="flex flex-col gap-3 sm:flex-row">
      {cards.map((card) => {
        const isCurrent = card.plan === currentTier;
        return (
          <div
            key={card.plan}
            className={cn(
              "flex flex-1 flex-col gap-3 rounded-xl border p-4",
              isCurrent && "border-blue-7",
            )}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{card.name}</h4>
              {isCurrent && <Badge colorScheme="blue">Current</Badge>}
            </div>
            <p className="font-bold">{card.priceLabel}</p>
            <p className="flex-1 text-sm text-gray-10">{card.blurb}</p>
            {!isCurrent && card.cta && (
              <Button
                variant="outline"
                render={(props) => <a {...props} href={card.cta!.href} />}
              >
                {card.cta.label}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  </div>
);
