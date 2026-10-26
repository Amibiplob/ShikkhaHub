import type { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
export default function PageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="container mx-auto flex-1 px-4 py-8 md:py-12">
        <div className="mb-8 max-w-3xl">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-primary">
            ShikkhaHub
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-3 text-muted-foreground">{description}</p>
          )}
        </div>
        {children}
      </main>
      <Footer />
    </div>
  );
}
