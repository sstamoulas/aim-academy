export interface AcademyEvent {
  id: string
  slug: string
  title: string
  description: string
  date: string
  time: string
  location: string
  price: string
  ages: string
  isDropOff: boolean
  status: 'upcoming' | 'sold-out' | 'past'
  flyerImageUrl: string
  registrationUrl: string
  activities: string[]
  included: string[]
  allergyInfo: string[]
  faq: Array<{ q: string; a: string }>
  published: boolean
  createdAt: string
}
