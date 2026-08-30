export interface PricingTier {
  id: string
  label: string      // e.g. "1 Child", "2 Children", "Family Pack"
  sublabel?: string  // e.g. "Per child rate"
  amount: number     // in cents
}

export interface EventDetail {
  id: string
  icon: string   // emoji
  label: string  // e.g. "Date"
  value: string  // e.g. "Friday, July 17, 2026"
}

export type SectionType = 'list' | 'faq' | 'text'

export interface EventSection {
  id: string
  type: SectionType
  title: string
  items?: string[]                        // for 'list'
  faqs?: Array<{ q: string; a: string }>  // for 'faq'
  body?: string                           // for 'text'
}

export interface AcademyEvent {
  id: string
  slug: string
  title: string
  description: string
  status: 'upcoming' | 'sold-out' | 'past'
  flyerImageUrl: string
  registrationUrl: string
  pricing?: PricingTier[]
  details: EventDetail[]
  sections: EventSection[]
  published: boolean
  createdAt: string
}
