import { Link } from 'react-router-dom'

export default function Gallery() {
  return (
    <main className="wrap">
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Manrope:wght@400;500;700;800&display=swap");
        :root {
          --bg: #f5f1e8;
          --panel: #fffaf1;
          --text: #203126;
          --muted: #5b6a5f;
          --green: #5f8550;
          --green-dark: #2f4d34;
          --wood: #b8874f;
          --wood-dark: #7d5532;
          --line: rgba(47, 77, 52, 0.14);
          --shadow: 0 18px 50px rgba(39, 55, 41, 0.12);
        }

        * { box-sizing: border-box; }
        html, body { margin: 0; min-height: 100%; }
        body {
          font-family: "Manrope", "Segoe UI", sans-serif;
          color: var(--text);
          background:
            radial-gradient(circle at top left, rgba(95, 133, 80, 0.18), transparent 32%),
            radial-gradient(circle at bottom right, rgba(184, 135, 79, 0.18), transparent 32%),
            linear-gradient(180deg, #faf7f0 0%, #f1eadf 100%);
        }

        a { color: inherit; text-decoration: none; }
        .wrap { width: min(1160px, calc(100% - 32px)); margin: 0 auto; }
        .hero { padding: 56px 0 24px; }
        .eyebrow {
          display: inline-flex;
          gap: 10px;
          align-items: center;
          padding: 10px 14px;
          border: 1px solid var(--line);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.65);
          color: var(--green-dark);
          font-weight: 800;
          letter-spacing: 0.02em;
          box-shadow: var(--shadow);
        }
        h1 {
          margin: 18px 0 12px;
          max-width: 12ch;
          font-family: "Fraunces", Georgia, serif;
          font-size: clamp(2.9rem, 7vw, 5.8rem);
          line-height: 0.95;
          letter-spacing: -0.04em;
        }
        .lead {
          max-width: 62ch;
          font-size: clamp(1.02rem, 2vw, 1.15rem);
          line-height: 1.7;
          color: var(--muted);
        }
        .cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 14px 18px;
          border-radius: 16px;
          background: linear-gradient(135deg, var(--green-dark), var(--green));
          color: white;
          font-weight: 800;
          box-shadow: 0 18px 28px rgba(47, 77, 52, 0.24);
        }
        .swatch-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .swatch {
          width: 46px;
          height: 14px;
          border-radius: 999px;
        }
        .preview {
          margin-top: auto;
          padding: 18px;
          border-radius: 22px;
          background:
            linear-gradient(140deg, rgba(95, 133, 80, 0.14), rgba(184, 135, 79, 0.14)),
            linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0.5));
          border: 1px solid rgba(47, 77, 52, 0.08);
        }
        .preview-line {
          height: 10px;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--green-dark), var(--green), var(--wood));
          margin-bottom: 10px;
        }
        .preview-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 12px;
        }
        .mini {
          min-height: 54px;
          border-radius: 18px;
          background: rgba(255,255,255,0.75);
          border: 1px solid rgba(47, 77, 52, 0.08);
        }
        .footer {
          color: var(--muted);
          padding: 0 0 36px;
          line-height: 1.7;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 18px;
          padding: 28px 0 64px;
        }
        .card {
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid var(--line);
          border-radius: 28px;
          box-shadow: var(--shadow);
          overflow: hidden;
        }
        .template-card {
          grid-column: span 6;
          padding: 22px;
          min-height: 240px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .template-card:hover { transform: translateY(-4px); box-shadow: 0 24px 60px rgba(39, 55, 41, 0.16); }
        .template-card strong { font-size: 1.1rem; }
        .template-card p { margin: 0; color: var(--muted); line-height: 1.6; }
        @media (max-width: 900px) {
          .template-card { grid-column: span 12; }
        }
      `}</style>

      <section className="hero">
        <div className="eyebrow">AIMAVA-inspired GitHub Pages templates</div>
        <h1>Warm, bright, and built to convert families.</h1>
        <p className="lead">
          Six distinct landing-page templates for a kids center inspired by the structure, programs, and trust cues on AIMAVA:
          Qur'an learning, Arabic, Islamic studies, summer camp, registration, and a nurturing weekend-school feel.
        </p>
      </section>

      <section id="templates" className="grid">
        <article className="card template-card">
          <strong>1. Canopy Campus</strong>
          <p>
            Split hero, proof bar, and stacked program cards. Best when the priority is fast trust and a clean conversion path.
          </p>
          <div className="swatch-row">
            <span className="swatch" style={{ background: '#2f4d34' }}></span>
            <span className="swatch" style={{ background: '#5f8550' }}></span>
            <span className="swatch" style={{ background: '#b8874f' }}></span>
            <span className="swatch" style={{ background: '#efe3c8' }}></span>
          </div>
          <div className="preview">
            <div className="preview-line"></div>
            <div className="preview-grid">
              <div className="mini" style={{ height: '120px' }}></div>
              <div style={{ display: 'grid', gap: '10px' }}>
                <div className="mini"></div>
                <div className="mini"></div>
              </div>
            </div>
          </div>
          <Link className="cta" to="/templates/canopy-campus">Open template</Link>
        </article>

        <article className="card template-card">
          <strong>2. Forest Path</strong>
          <p>
            A vertical story flow with milestones, age groups, and registration steps. Good for parents who want clarity and reassurance.
          </p>
          <div className="swatch-row">
            <span className="swatch" style={{ background: '#24412b' }}></span>
            <span className="swatch" style={{ background: '#6d9b5f' }}></span>
            <span className="swatch" style={{ background: '#a36f3c' }}></span>
            <span className="swatch" style={{ background: '#f1e6d1' }}></span>
          </div>
          <div className="preview">
            <div className="preview-line"></div>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div className="mini" style={{ width: '78%' }}></div>
              <div className="mini" style={{ width: '92%' }}></div>
              <div className="mini" style={{ width: '66%' }}></div>
            </div>
          </div>
          <Link className="cta" to="/templates/forest-path">Open template</Link>
        </article>

        <article className="card template-card">
          <strong>3. Sunlit Studio</strong>
          <p>
            Editorial storytelling with a strong testimonial block and classroom snapshots. This feels more premium and emotionally warm.
          </p>
          <div className="swatch-row">
            <span className="swatch" style={{ background: '#3d5f42' }}></span>
            <span className="swatch" style={{ background: '#84a86f' }}></span>
            <span className="swatch" style={{ background: '#c29357' }}></span>
            <span className="swatch" style={{ background: '#fff3df' }}></span>
          </div>
          <div className="preview">
            <div className="preview-line"></div>
            <div className="preview-grid">
              <div className="mini" style={{ height: '86px' }}></div>
              <div className="mini" style={{ height: '86px' }}></div>
            </div>
          </div>
          <Link className="cta" to="/templates/sunlit-studio">Open template</Link>
        </article>

        <article className="card template-card">
          <strong>4. Woodgrain Atelier</strong>
          <p>
            Modular card wall with tactile-looking surfaces, class chips, and a gallery strip. Useful when you want a playful but organized UI.
          </p>
          <div className="swatch-row">
            <span className="swatch" style={{ background: '#2b4730' }}></span>
            <span className="swatch" style={{ background: '#729767' }}></span>
            <span className="swatch" style={{ background: '#c18649' }}></span>
            <span className="swatch" style={{ background: '#f4ead6' }}></span>
          </div>
          <div className="preview">
            <div className="preview-line"></div>
            <div className="preview-grid">
              <div style={{ display: 'grid', gap: '10px' }}>
                <div className="mini"></div>
                <div className="mini"></div>
              </div>
              <div className="mini" style={{ height: '120px' }}></div>
            </div>
          </div>
          <Link className="cta" to="/templates/woodgrain-atelier">Open template</Link>
        </article>

        <article className="card template-card">
          <strong>6. Forest &amp; Canopy</strong>
          <p>
            Forest Path on mobile, Canopy Campus on desktop. Two distinct layouts in one file, switched purely by breakpoint — no JavaScript.
          </p>
          <div className="swatch-row">
            <span className="swatch" style={{ background: '#2b2118' }}></span>
            <span className="swatch" style={{ background: '#5d8162' }}></span>
            <span className="swatch" style={{ background: '#8c5a31' }}></span>
            <span className="swatch" style={{ background: '#fdfbf7' }}></span>
          </div>
          <div className="preview">
            <div className="preview-line"></div>
            <div className="preview-grid">
              <div className="mini" style={{ height: '100px' }}></div>
              <div style={{ display: 'grid', gap: '10px' }}>
                <div className="mini"></div>
                <div className="mini"></div>
              </div>
            </div>
          </div>
          <Link className="cta" to="/templates/forest-canopy">Open template</Link>
        </article>

        <article className="card template-card">
          <strong>5. Growth Loop</strong>
          <p>
            Conversion-first layout with a sticky CTA feel, stepper, and benefit blocks. Best for registration and summer-camp promotion.
          </p>
          <div className="swatch-row">
            <span className="swatch" style={{ background: '#203f29' }}></span>
            <span className="swatch" style={{ background: '#6f9a58' }}></span>
            <span className="swatch" style={{ background: '#bf8f52' }}></span>
            <span className="swatch" style={{ background: '#efe2c5' }}></span>
          </div>
          <div className="preview">
            <div className="preview-line"></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
              <div className="mini" style={{ height: '70px' }}></div>
              <div className="mini" style={{ height: '70px' }}></div>
              <div className="mini" style={{ height: '70px' }}></div>
            </div>
          </div>
          <Link className="cta" to="/templates/growth-loop">Open template</Link>
        </article>
      </section>

      <section className="footer">
        The templates are based on the public structure of AIMAVA, especially: About Us, Programs, Registration, Summer Camp 2026, and the workshop/event flow.
        The new AIMAVA code set mirrors the style of the reference layout you shared, but keeps the school-specific language and brand goals.
      </section>
    </main>
  )
}
