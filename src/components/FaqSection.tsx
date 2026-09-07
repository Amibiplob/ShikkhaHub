import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLanguage } from "@/contexts/LanguageContext";
import { en } from "@/lib/translations";

const items = [1, 2, 3, 4, 5];

const FaqSection = () => {
  const { t } = useLanguage();

  return (
    <section className="border-t border-border py-20 md:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: items.map((n) => ({
              "@type": "Question",
              name: en[`faq.q${n}`],
              acceptedAnswer: { "@type": "Answer", text: en[`faq.a${n}`] },
            })),
          }),
        }}
      />
      <div className="container mx-auto max-w-3xl px-4">
        <div className="mb-12 text-center">
          <span className="mb-3 inline-block text-sm font-medium uppercase tracking-widest text-primary">
            {t("faq.eyebrow")}
          </span>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t("faq.title")}</h2>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {items.map((n, i) => (
            <AccordionItem key={n} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base font-semibold">{t(`faq.q${n}`)}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {t(`faq.a${n}`)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FaqSection;
