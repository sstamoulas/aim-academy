import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Use application default credentials (gcloud auth already set up)
if (!getApps().length) {
  initializeApp({ projectId: 'aim-academy-7fdae' })
}

const db = getFirestore()

function uid() {
  return Math.random().toString(36).slice(2)
}

const events = [
  {
    slug: 'animals-in-quran',
    title: "Animals in the Qur'an Cookie Baking Workshop",
    description:
      "A fun, hands-on workshop where children baked and decorated delicious animal-shaped cookies while discovering the beautiful lessons behind animals mentioned in the Qur'an.",
    status: 'past',
    flyerImageUrl:
      'https://i0.wp.com/aimava.org/wp-content/uploads/2026/07/fb5677d7-6ea3-4c68-b661-71884783461f.jpg?resize=791%2C1024&ssl=1',
    registrationUrl: '',
    pricing: [],
    published: true,
    createdAt: '2026-07-01T00:00:00.000Z',
    details: [
      { id: uid(), icon: '📅', label: 'Date',     value: 'Friday, July 17, 2026' },
      { id: uid(), icon: '🕟', label: 'Time',     value: '4:30 – 7:30 PM' },
      { id: uid(), icon: '📍', label: 'Location', value: '14325 Willard Rd Unit D, Chantilly, VA 20151' },
      { id: uid(), icon: '👧', label: 'Ages',     value: 'Ages 5+' },
      { id: uid(), icon: '💲', label: 'Price',    value: '$24.99' },
      { id: uid(), icon: '🚗', label: 'Drop-off', value: 'Parents drop off at 4:30 PM, pickup at 7:30 PM' },
    ],
    sections: [
      {
        id: uid(),
        type: 'list',
        title: 'Your child will enjoy',
        items: [
          'Baking cookies',
          'Decorating cookies',
          'Storytime',
          "Learning about animals in the Qur'an",
          'Animal craft',
        ],
      },
      {
        id: uid(),
        type: 'list',
        title: "What's Included",
        items: ['All supplies', 'Craft materials', 'Cookie decorating', 'Storytime'],
      },
      {
        id: uid(),
        type: 'faq',
        title: 'Frequently Asked Questions',
        faqs: [
          {
            q: 'What ages is this workshop for?',
            a: 'Children ages 5 and up.',
          },
          {
            q: 'Is this a drop-off event?',
            a: 'Yes. Parents drop off at 4:30 PM and return for pickup at 7:30 PM.',
          },
          {
            q: 'Are supplies included?',
            a: 'Yes. All baking materials, craft supplies, and workshop activities are included in the registration fee.',
          },
          {
            q: 'What should my child wear?',
            a: 'Comfortable clothing and closed-toe shoes are recommended.',
          },
          {
            q: 'What if my child has food allergies?',
            a: 'We cannot guarantee an allergen-free environment. Please disclose any allergies on the registration form.',
          },
        ],
      },
    ],
  },

  {
    slug: 'prophet-yunus-water-slime',
    title: 'Prophet Yunus Water Slime Workshop',
    description:
      'A hands-on, faith-inspired workshop where students explored the story of Prophet Yunus (عليه السلام) through the fun and creativity of slime-making.',
    status: 'sold-out',
    flyerImageUrl:
      'https://i0.wp.com/aimava.org/wp-content/uploads/2026/08/3eaabbce-0d6a-43d3-8118-454864bbb242.jpg?w=750&ssl=1',
    registrationUrl: '',
    pricing: [],
    published: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    details: [
      { id: uid(), icon: '📅', label: 'Date',     value: 'August 2026' },
      { id: uid(), icon: '📍', label: 'Location', value: '14325 Willard Rd Unit D, Chantilly, VA 20151' },
      { id: uid(), icon: '👧', label: 'Ages',     value: 'Ages 5+' },
    ],
    sections: [
      {
        id: uid(),
        type: 'text',
        title: 'Registration Closed',
        body: 'We reached maximum capacity for this event. Jazak Allah khayran for the overwhelming interest and community support!\n\nIf you registered and paid, event details and updates were sent to your registered parent email address.',
      },
    ],
  },
]

async function seed() {
  for (const event of events) {
    await db.collection('events').doc(event.slug).set(event)
    console.log(`✓ Uploaded: ${event.title}`)
  }
  console.log('\nDone! Both events are now in Firestore.')
  process.exit(0)
}

seed().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
