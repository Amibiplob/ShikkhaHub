import { GraduationCap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const members = ['Md Biplob Hossain', 'Leon Khan', 'Al Amin', 'Asif Khan'];
export default function ProjectTeamSection() {
  const { t } = useLanguage();
  return <section id="project-team" aria-labelledby="project-team-heading" className="border-t border-border py-12 md:py-16">
    <div className="container mx-auto px-4">
      <p className="mb-2 text-sm uppercase tracking-widest text-primary">{t('team.eyebrow')}</p>
      <h2 id="project-team-heading" className="text-3xl font-bold tracking-tight">{t('team.title')}</h2>
      <p className="mt-4 max-w-3xl text-muted-foreground">{t('team.description')}</p>
      <p className="mt-3 font-medium">ShikkhaHub — An Online Based Educational Platform</p>
      <ul className="my-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {members.map(name => <li key={name} className="rounded-xl border border-border bg-card p-5 font-semibold">{name}</li>)}
      </ul>
      <div className="flex items-start gap-4 border-l-2 border-primary bg-muted/30 p-5">
        <GraduationCap className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
        <div><p className="text-sm text-muted-foreground">{t('team.supervisor')}</p>
          <h3 className="mt-1 text-lg font-semibold">Ahsan Habib</h3>
          <p className="text-sm text-muted-foreground">{t('team.supervisorRole')}</p>
        </div>
      </div>
    </div>
  </section>;
}
