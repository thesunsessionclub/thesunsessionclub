import './App.css'

const lineup = [
  {
    name: 'Mara Sol',
    role: 'Resident / warm tension',
    note: 'Percussive rollers, slow-burn vocals, sunrise discipline.',
  },
  {
    name: 'Niko Vanta',
    role: 'Guest / late pressure',
    note: 'Sleek low-end, warehouse hypnosis, peak-time precision.',
  },
  {
    name: 'Daze Motel',
    role: 'Live hybrid set',
    note: 'Analog fragments, acid drizzle, tactile broken grooves.',
  },
]

const rituals = [
  {
    title: 'Next signal',
    copy: 'One date, one room, one carefully tuned moment. Sunsesh is built around anticipation, not noise.',
  },
  {
    title: 'Roster energy',
    copy: 'Residents and guests are framed like a world, not a booking list. Every name should add tension to the night.',
  },
  {
    title: 'Afterglow archive',
    copy: 'Past sessions become proof of taste. Clips, stills, and set fragments should make the archive feel collectible.',
  },
]

const archiveMoments = [
  'Terrace opener / 05:42 PM / amber haze',
  'Warehouse pulse / 01:16 AM / red pressure',
  'Closing orbit / 04:31 AM / smoked silver',
]

function App() {
  return (
    <main className="page-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <div className="ambient grid-noise" aria-hidden="true" />

      <header className="site-header">
        <a className="brand-mark" href="#top" aria-label="Sunsesh home">
          <span className="brand-mark__sun" />
          <span className="brand-mark__text">SUNSESH</span>
        </a>

        <nav className="site-nav" aria-label="Primary">
          <a href="#experience">Experience</a>
          <a href="#lineup">Lineup</a>
          <a href="#archive">Archive</a>
          <a href="#list">Guest list</a>
        </nav>

        <a className="header-cta" href="#tickets">
          Reserve entry
        </a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Mexico City season 02 / sunset-to-strobe ritual</p>
          <h1>
            A golden-hour club world
            <span> built for the after-dark crowd.</span>
          </h1>
          <p className="hero-copy__lede">
            Sunsesh is a boutique electronic gathering where warm light, heavy groove,
            and scene-first curation collide. Less mass event, more signal for the people
            who know where the night starts.
          </p>

          <div className="hero-actions">
            <a className="button button-primary" href="#tickets">
              Get tickets
            </a>
            <a className="button button-secondary" href="#archive">
              Enter archive
            </a>
          </div>

          <dl className="hero-meta">
            <div>
              <dt>Next drop</dt>
              <dd>April 26 / Roma Norte</dd>
            </div>
            <div>
              <dt>Format</dt>
              <dd>Sunset warm-up + 2AM pressure</dd>
            </div>
            <div>
              <dt>Access</dt>
              <dd>Limited guest list and first-release tickets</dd>
            </div>
          </dl>
        </div>

        <aside className="hero-panel" aria-label="Featured event">
          <p className="panel-kicker">Featured session</p>
          <div className="hero-panel__frame">
            <p className="panel-date">26 APR</p>
            <h2>Solar Circuit</h2>
            <p className="panel-copy">
              Rooftop heat, smoked mirrors, low-slung percussion, and a final-room
              descent into darker hours.
            </p>
          </div>

          <ul className="hero-panel__list" aria-label="Featured lineup">
            <li>Mara Sol</li>
            <li>Niko Vanta</li>
            <li>Daze Motel live</li>
          </ul>
        </aside>
      </section>

      <section className="next-event" id="tickets">
        <div className="section-heading">
          <p className="eyebrow">Next event</p>
          <h2>The page should make the next night feel inevitable.</h2>
        </div>

        <article className="event-card">
          <div className="event-card__primary">
            <p className="event-card__label">Saturday / April 26 / CDMX</p>
            <h3>Solar Circuit at Casa Prisma</h3>
            <p className="event-card__body">
              A calibrated progression from terrace glow into a denser room after
              midnight. Capacity stays intentionally tight to protect the atmosphere.
            </p>
          </div>

          <div className="event-card__details">
            <div>
              <span>Doors</span>
              <strong>6:30 PM</strong>
            </div>
            <div>
              <span>Final entry</span>
              <strong>11:45 PM</strong>
            </div>
            <div>
              <span>Tier one</span>
              <strong>MXN 420</strong>
            </div>
          </div>

          <div className="event-card__actions">
            <a className="button button-primary" href="#list">
              Lock guest list
            </a>
            <a className="button button-secondary" href="#lineup">
              View lineup
            </a>
          </div>
        </article>
      </section>

      <section className="ritual-grid" id="experience">
        {rituals.map((item) => (
          <article className="ritual-card" key={item.title}>
            <p className="ritual-card__index">0{rituals.indexOf(item) + 1}</p>
            <h3>{item.title}</h3>
            <p>{item.copy}</p>
          </article>
        ))}
      </section>

      <section className="lineup-section" id="lineup">
        <div className="section-heading section-heading--split">
          <div>
            <p className="eyebrow">Selected roster</p>
            <h2>Residents, guests, and live tension.</h2>
          </div>
          <p className="section-heading__aside">
            Every booking should reinforce the Sunsesh world: sensual low end,
            controlled pressure, and a sense of ascent before impact.
          </p>
        </div>

        <div className="lineup-grid">
          {lineup.map((artist) => (
            <article className="lineup-card" key={artist.name}>
              <p className="lineup-card__role">{artist.role}</p>
              <h3>{artist.name}</h3>
              <p>{artist.note}</p>
              <a href="#list">Follow this signal</a>
            </article>
          ))}
        </div>
      </section>

      <section className="manifesto">
        <p className="eyebrow">Manifesto</p>
        <div className="manifesto__layout">
          <h2>
            Not a generic event calendar.
            <span> A club language with memory.</span>
          </h2>
          <div className="manifesto__copy">
            <p>
              Sunsesh should feel like a scene with its own temperature. The visual
              identity, the event cadence, the archive, and the ticket flow all need
              to tell the same story: this is a night worth planning around.
            </p>
            <p>
              The strongest version of the brand balances warm sunset ritual with a
              darker, more physical late-night shift. That contrast is the signature.
            </p>
          </div>
        </div>
      </section>

      <section className="archive-section" id="archive">
        <div className="section-heading section-heading--split">
          <div>
            <p className="eyebrow">Afterglow archive</p>
            <h2>Past sessions should feel collectible.</h2>
          </div>
          <a className="text-link" href="#list">
            Unlock full archive
          </a>
        </div>

        <div className="archive-strip" aria-label="Past moments">
          {archiveMoments.map((moment) => (
            <article className="archive-card" key={moment}>
              <div className="archive-card__glow" aria-hidden="true" />
              <p>{moment}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="list-section" id="list">
        <div className="list-section__copy">
          <p className="eyebrow">Inner circle</p>
          <h2>Join the list before the next signal goes public.</h2>
          <p>
            Early access, password drops, venue reveals, and members-only releases.
            Position this as belonging, not just subscription.
          </p>
        </div>

        <form className="list-form">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@afterdark.fm"
          />
          <button type="submit" className="button button-primary">
            Join the guest list
          </button>
        </form>
      </section>
    </main>
  )
}

export default App
