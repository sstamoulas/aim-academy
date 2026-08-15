import { Link } from 'react-router-dom'

export default function GrowthLoop() {
  return (
    <div className="bg-cream font-body text-stone-800">
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <div className="bg-white/85 backdrop-blur border border-stone-200/70 rounded-3xl px-5 py-4 shadow-sm flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-kids text-xl shadow-md">A</div>
            <div className="leading-none">
              <div className="font-kids text-lg text-stone-900">Anas Ibn Malik Academy</div>
              <div className="text-xs uppercase tracking-widest text-emerald-700 font-bold">Growth Loop</div>
            </div>
          </Link>
          <a href="#join" className="bg-amber-700 text-white px-5 py-2.5 rounded-full hover:bg-amber-800 transition shadow-sm font-kids tracking-wide">Register Now</a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
        <section className="grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-6">
            <span className="inline-block bg-emerald-100 text-emerald-800 text-sm font-bold tracking-wider uppercase px-4 py-1.5 rounded-full">Chantilly, VA weekend school</span>
            <h1 className="font-kids text-5xl lg:text-6xl text-stone-900 leading-tight">
              A compact page built to move parents from interest to action.
            </h1>
            <p className="text-lg text-stone-600 max-w-2xl leading-relaxed">
              This funnel is intentionally shorter and more direct. It keeps the same warm green and wood tone, but the page flow is more conversion-oriented than the other templates.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#join" className="bg-emerald-600 text-white text-center font-kids text-lg px-8 py-4 rounded-2xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-100">Explore Programs</a>
              <a href="#steps" className="border-2 border-[#E6DFD3] text-center font-semibold text-stone-700 px-8 py-4 rounded-2xl hover:bg-stone-50 transition">View the Steps</a>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="relative rounded-[36px] overflow-hidden shadow-2xl border-8 border-white bg-cover bg-center min-h-[420px]" style={{ backgroundImage: "linear-gradient(to top, rgba(43,33,24,.45), rgba(43,33,24,.05)), url('https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=1000')" }}>
              <div className="absolute inset-0 flex items-end p-6">
                <div className="bg-white/92 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg">
                  <div className="text-xs font-bold uppercase tracking-widest text-sage-700">Authentic Curriculum</div>
                  <div className="font-kids text-wood-dark text-lg">Qur'an &amp; Sunnah Base</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="steps" className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 rounded-[30px] bg-white p-7 sm:p-8 shadow-sm border border-stone-200/70">
            <div className="text-xs font-bold uppercase tracking-widest text-wood">Three-step loop</div>
            <h2 className="font-kids text-3xl text-stone-900 mt-2">A short flow with a strong finish.</h2>
            <p className="text-stone-600 mt-4 leading-relaxed">The structure is lean on purpose: show value, show proof, give a simple next step.</p>
          </div>
          <div className="lg:col-span-8 grid md:grid-cols-3 gap-4">
            <div className="rounded-[30px] bg-sage-50 p-6 border border-stone-200/70">
              <div className="text-xs font-bold uppercase tracking-widest text-sage-700">01</div>
              <div className="font-kids text-2xl mt-3 text-wood-dark">Promise</div>
              <p className="text-sm text-stone-600 mt-2 leading-relaxed">Warm, kid-centered learning with a faith-first foundation.</p>
            </div>
            <div className="rounded-[30px] bg-orange-50 p-6 border border-stone-200/70">
              <div className="text-xs font-bold uppercase tracking-widest text-wood">02</div>
              <div className="font-kids text-2xl mt-3 text-wood-dark">Proof</div>
              <p className="text-sm text-stone-600 mt-2 leading-relaxed">A clear scene, a clear teacher voice, and clear program options.</p>
            </div>
            <div className="rounded-[30px] bg-white p-6 border border-stone-200/70 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-700">03</div>
              <div className="font-kids text-2xl mt-3 text-wood-dark">Action</div>
              <p className="text-sm text-stone-600 mt-2 leading-relaxed">One visible registration button removes hesitation.</p>
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 rounded-[34px] bg-stone-950 text-white p-8 sm:p-10 shadow-2xl">
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-200">Conversion cues</div>
            <h2 className="font-kids text-3xl mt-3 leading-tight">Use contrast, spacing, and one clear CTA.</h2>
            <div className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-white/10 rounded-2xl p-4">One primary button</div>
              <div className="bg-white/10 rounded-2xl p-4">Trust immediately visible</div>
              <div className="bg-white/10 rounded-2xl p-4">Warm kid-friendly tone</div>
              <div className="bg-white/10 rounded-2xl p-4">Simple information stack</div>
            </div>
          </div>
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white rounded-[34px] p-7 sm:p-8 shadow-sm border border-stone-200/70">
              <div className="text-xs font-bold uppercase tracking-widest text-sage-700">Program notes</div>
              <div className="mt-4 grid gap-3">
                <div className="flex items-center justify-between"><span>Weekend academy</span><span className="font-bold text-wood-dark">Ages 5+</span></div>
                <div className="flex items-center justify-between"><span>Creative workshops</span><span className="font-bold text-wood-dark">Limited seats</span></div>
                <div className="flex items-center justify-between"><span>Parent clarity</span><span className="font-bold text-wood-dark">High trust</span></div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-700 to-sage-600 rounded-[34px] p-7 sm:p-8 text-white shadow-xl">
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-100">Parent quote</div>
              <p className="text-2xl font-bold mt-3 leading-tight">"Everything felt easy to understand, which made registering feel comfortable."</p>
            </div>
          </div>
        </section>

        <section id="join" className="rounded-[34px] bg-white p-8 sm:p-10 shadow-sm border border-stone-200/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-stone-400">Next step</div>
            <div className="font-kids text-3xl text-stone-900 mt-2">Open the registration portal</div>
            <p className="text-stone-600 mt-2">This is the page where the action should feel obvious.</p>
          </div>
          <a href="#" className="bg-amber-600 hover:bg-amber-700 text-white font-kids px-8 py-4 rounded-2xl shadow-md transition text-center">Open Registration Portal</a>
        </section>
      </main>
    </div>
  )
}
