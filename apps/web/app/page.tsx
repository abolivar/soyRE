const domainPillars = [
  'Properties',
  'Mandates',
  'Documents',
  'Showings',
  'Offers',
  'Deals',
  'Commissions',
  'Audit',
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-8 md:px-10">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-between gap-12">
        <header className="flex items-center justify-between border-b border-[var(--line)] pb-5">
          <div className="text-xl font-semibold tracking-normal">soyRE</div>
          <div className="text-sm text-[var(--muted)]">Broker operations platform</div>
        </header>

        <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-normal text-[var(--accent-strong)]">
              SaaS inmobiliario operativo
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal md:text-6xl">
              El inmueble como producto, no como registro de CRM.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              Base técnica inicial para construir captación, mandatos,
              documentos, visitas, ofertas, cierres, comisiones y auditoría
              sobre un dominio modular.
            </p>
          </div>

          <aside className="border-l-4 border-[var(--accent)] bg-white/55 p-6">
            <p className="text-sm font-semibold uppercase tracking-normal text-[var(--accent-strong)]">
              Bootstrap status
            </p>
            <p className="mt-3 text-2xl font-semibold">Ready for domain design</p>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              No auth, no business models, no premature workflows. The next step
              is to turn the foundational product document into small tickets.
            </p>
          </aside>
        </div>

        <footer className="grid gap-3 border-t border-[var(--line)] pt-5 sm:grid-cols-2 md:grid-cols-4">
          {domainPillars.map((pillar) => (
            <div
              className="border border-[var(--line)] bg-white/50 px-4 py-3 text-sm font-medium"
              key={pillar}
            >
              {pillar}
            </div>
          ))}
        </footer>
      </section>
    </main>
  );
}
