export default function IndoorNavigationLandingPage() {
  const features = [
    {
      title: "Search by room or class",
      description:
        "Let users type a room number, office, or class name and get directed instantly.",
    },
    {
      title: "Multi-floor routing",
      description:
        "Show the path one floor at a time, including stairs and elevator transitions.",
    },
    {
      title: "Interactive floor plans",
      description:
        "Display clear building maps with highlighted routes and destination markers.",
    },
  ];

  const steps = [
    "Choose a building",
    "Enter a destination",
    "Follow the route floor by floor",
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-lg font-semibold tracking-tight">Campus Route Finder</p>
            <p className="text-sm text-slate-500">Indoor navigation for buildings and classrooms</p>
          </div>
          <nav className="hidden gap-6 text-sm text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#how-it-works" className="hover:text-slate-900">How it works</a>
            <a href="#demo" className="hover:text-slate-900">Demo</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 md:grid-cols-2 md:items-center">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">
              Built for indoor campus navigation
            </div>
            <h1 className="max-w-xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Help users find any room, class, or office inside a building.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
              A clean interface for searching destinations, viewing floor plans, and following the fastest route across multiple floors.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:scale-[1.01]">
                Open Demo
              </button>
              <button className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                View Buildings
              </button>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 p-4 shadow-sm">
                <p className="text-2xl font-semibold">1</p>
                <p className="mt-1 text-sm text-slate-500">Search bar for room or class</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 shadow-sm">
                <p className="text-2xl font-semibold">2</p>
                <p className="mt-1 text-sm text-slate-500">Route shown by floor</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 shadow-sm">
                <p className="text-2xl font-semibold">3</p>
                <p className="mt-1 text-sm text-slate-500">Stairs and elevator support</p>
              </div>
            </div>
          </div>

          <div>
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 shadow-xl">
              <div className="rounded-[1.5rem] bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Live Preview</p>
                    <h2 className="text-xl font-semibold">Find your destination</h2>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    Fastest Route
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Building</label>
                    <div className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-500">
                      Select a building
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Destination</label>
                    <div className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-500">
                      Example: Room 402 or BIO 210
                    </div>
                  </div>

                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-700">Route Preview</p>
                    <div className="mt-3 space-y-3">
                      <div className="rounded-xl bg-slate-900 px-4 py-3 text-sm text-white">
                        Floor 1: Start at Main Entrance → North Hall → Elevator
                      </div>
                      <div className="rounded-xl bg-slate-200 px-4 py-3 text-sm text-slate-700">
                        Floor 4: Exit Elevator → Turn Right → Room 402
                      </div>
                    </div>
                  </div>

                  <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:scale-[1.01]">
                    Generate Route
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="bg-slate-50 py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Features</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Everything users need to navigate indoors.
              </h2>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-10 md:grid-cols-2 md:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">How it works</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  A simple flow for first-time users.
                </h2>
                <div className="mt-8 space-y-4">
                  {steps.map((step, index) => (
                    <div key={step} className="flex items-start gap-4 rounded-2xl border border-slate-200 p-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                        {index + 1}
                      </div>
                      <p className="pt-1 text-slate-700">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg">
                <div className="rounded-[1.5rem] bg-slate-100 p-6">
                  <p className="text-sm text-slate-500">Example destination</p>
                  <h3 className="mt-2 text-2xl font-semibold">O'Connell Center 120</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Search results can connect class data with room locations so users can tap a class and go straight to the correct room.
                  </p>
                  <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-sm font-medium">Next class</p>
                    <p className="mt-1 text-lg font-semibold">HIST 341W</p>
                    <p className="text-sm text-slate-500">Room 120 · Monday 1:00 PM</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="demo" className="bg-slate-900 py-20 text-white">
          <div className="mx-auto max-w-5xl px-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Ready to build</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              Start with a clean sample page, then connect your real building data.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-300">
              You do not need the full backend first. Build the landing page as a static interface, then connect search, floor plans, and routing after the layout is finished.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button className="rounded-2xl bg-white px-6 py-3 text-sm font-medium text-slate-900 shadow-sm transition hover:scale-[1.01]">
                Use This Layout
              </button>
              <button className="rounded-2xl border border-slate-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800">
                Customize Content
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
