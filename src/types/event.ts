export interface EventPricing {
  oneChild: number      // in cents
  twoChildren: number   // in cents
  threeChildren: number // in cents
}

export interface AcademyEvent {
  id: string
  slug: string
  title: string
  description: string
  date: string
  time: string
  location: string
  price: string         // display string, e.g. "$24.99" (kept for legacy/display)
  ages: string
  isDropOff: boolean
  status: 'upcoming' | 'sold-out' | 'past'
  flyerImageUrl: string
  registrationUrl: string
  pricing?: EventPricing
  activities: string[]
  included: string[]
  allergyInfo: string[]
  faq: Array<{ q: string; a: string }>
  published: boolean
  createdAt: string
}
