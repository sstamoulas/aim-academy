import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

// TODO: Replace with your actual Zeffy campaign URL once the campaign is created at zeffy.com
const ZEFFY_URL = 'https://www.zeffy.com/en-US/fundraising/aim-academy'

const CATEGORIES = [
  {
    emoji: '🏫',
    title: 'Utilities & Operations',
    description:
      'Help cover the day-to-day costs of running the academy — rent, utilities, supplies, and administrative expenses that keep our doors open.',
  },
  {
    emoji: '🌟',
    title: 'Sponsor a Student',
    description:
      'Sponsor a student\'s tuition on a recurring monthly basis. Your contribution ensures no child misses out on Islamic education due to financial hardship.',
    badge: 'Monthly',
  },
  {
    emoji: '📚',
    title: 'Books & Curriculum',
    description:
      'Fund Islamic Studies textbooks, workbooks, and curriculum materials for our students. Quality resources make a lasting difference in every lesson.',
  },
  {
    emoji: '📖',
    title: "Qur'an",
    description:
      "Support our Qur'an program — from printed Mushafs for students who need them to materials that support tajweed instruction and memorization.",
  },
]

export default function Donate() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <div className="bg-gradient-to-br from-sage-700 to-sage-600 text-white py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-5xl mb-5">🤲</div>
            <h1 className="font-kids text-4xl sm:text-5xl mb-4">Support Our Mission</h1>
            <p className="text-sage-100 font-quick text-lg leading-relaxed max-w-xl mx-auto">
              Every contribution — large or small — helps us provide quality Islamic education to the next generation.
              Your sadaqah makes a direct impact on our students and community.
            </p>
            <a
              href={ZEFFY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-8 bg-white text-sage-700 font-bold font-quick text-lg px-10 py-4 rounded-full shadow-lg hover:shadow-xl hover:brightness-95 transition"
            >
              Donate Now
            </a>
            <p className="text-sage-200 text-xs font-quick mt-3">
              Powered by Zeffy — 100% of your donation goes to AIM Academy (no platform fees)
            </p>
          </div>
        </div>

        {/* Categories */}
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="font-kids text-3xl text-wood-dark text-center mb-2">Where Your Gift Goes</h2>
          <p className="text-stone-500 font-quick text-center mb-10">
            Choose a cause that resonates with you, or give to general operations.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            {CATEGORIES.map(cat => (
              <div key={cat.title} className="bg-white rounded-[24px] border border-stone-200/70 shadow-sm p-6">
                <div className="flex items-start gap-4">
                  <div className="text-3xl flex-shrink-0">{cat.emoji}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-kids text-xl text-wood-dark leading-tight">{cat.title}</h3>
                      {cat.badge && (
                        <span className="text-xs font-quick font-bold bg-sage-100 text-sage-700 px-2 py-0.5 rounded-full">
                          {cat.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-stone-500 font-quick text-sm leading-relaxed">{cat.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 bg-white rounded-[28px] border border-stone-200/70 shadow-sm p-8 text-center">
            <h3 className="font-kids text-2xl text-wood-dark mb-2">Ready to Give?</h3>
            <p className="text-stone-500 font-quick text-sm mb-6 max-w-md mx-auto">
              All donations are processed securely through Zeffy. You can give once or set up a recurring monthly contribution.
            </p>
            <a
              href={ZEFFY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-sage-600 hover:bg-sage-700 text-white font-bold font-quick text-base px-10 py-4 rounded-full shadow-md transition"
            >
              Donate via Zeffy →
            </a>
            <p className="text-stone-400 text-xs font-quick mt-4">
              Questions? <a href="/contact" className="underline hover:text-stone-600">Contact us</a>
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
