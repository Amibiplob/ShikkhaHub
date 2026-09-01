import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    q: "Is ShikkhaHub free to use?",
    a: "You can create an account and browse published courses for free. Individual teachers decide what content they publish on the platform.",
  },
  {
    q: "Do I get a certificate?",
    a: "Yes. When you complete all lessons in a course, a downloadable certificate is generated in your Achievements page along with any badges you earned.",
  },
  {
    q: "How do live classes work?",
    a: "Teachers schedule a live class from the course page. When it starts, you join directly in the browser — no extra app or external meeting link needed. Recordings are available afterwards.",
  },
  {
    q: "Can I ask questions while learning?",
    a: "Every course has discussions, and the community forum is open for career advice and technical help. Enrolled students can also use the AI course assistant.",
  },
  {
    q: "Can I teach on ShikkhaHub?",
    a: "Yes. Sign up and request a teacher account to build courses, host live classes, and grade assignments from the teacher dashboard.",
  },
];

const FaqSection = () => (
  <section className="border-t border-border py-20 md:py-24">
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      }}
    />
    <div className="container mx-auto max-w-3xl px-4">
      <div className="mb-12 text-center">
        <span className="mb-3 inline-block text-sm font-medium uppercase tracking-widest text-primary">FAQ</span>
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Frequently asked questions</h2>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {faqs.map((f, i) => (
          <AccordionItem key={f.q} value={`item-${i}`}>
            <AccordionTrigger className="text-left text-base font-semibold">{f.q}</AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);

export default FaqSection;
