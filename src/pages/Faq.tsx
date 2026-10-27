import { useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
Accordion,
AccordionContent,
AccordionItem,
AccordionTrigger,
} from "@/components/ui/accordion";
import { filterFaqs } from "@/lib/faqs";
export default function Faq() {
  const [search, setSearch] = useState("");
  const items = filterFaqs(search);
  return (
    <PageShell
      title="Frequently asked questions"
      description="Practical answers about learning, teaching, tutoring and certificates."
    >
      <div className="mb-6 max-w-xl">
        <Label htmlFor="faq-search">Search questions</Label>
        <Input
          id="faq-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Try certificates or tutoring"
        />
      </div>
      <Accordion type="single" collapsible className="max-w-3xl">
        {items.map(([group, q, a]) => (
          <AccordionItem key={q} value={q}>
            <AccordionTrigger className="text-left">{q}</AccordionTrigger>
            <AccordionContent>
              <span className="mb-2 block text-xs uppercase tracking-wider text-primary">
                {group}
              </span>
              {a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {!items.length && (
        <p role="status" className="py-8 text-muted-foreground">
          No matching questions. Try a different search.
        </p>
      )}
      <p className="mt-8">
        Still need help?{" "}
        <Link className="text-primary underline" to="/contact">
          Contact Support
        </Link>
      </p>
    </PageShell>
  );
}
