export interface ProgramMedia {
  id: string
  type: 'image' | 'video'
  url: string
  caption?: string
}


export interface Program {
  id: string
  emoji: string
  name: string          // label in nav dropdown
  label: string         // small uppercase label on card
  title: string         // heading on card
  description: string   // body text on card
  imageUrl?: string     // card image URL (falls back to /class-photo.jpg)
  imageStyle?: string   // extra inline CSS for background (e.g. gradient overlay)
  href?: string         // anchor or external link (defaults to #dc-programs)
  comingSoon?: boolean  // shows "Coming soon" badge in nav, disables card
  order: number
  published: boolean
  /** Classroom photos/videos shown in the program card gallery strip */
  media?: ProgramMedia[]
}

export interface Achievement {
  id: string
  text: string          // e.g. "5 students completed Hifz"
  order: number
}

export interface Review {
  id: string
  quote: string
  author: string
  role?: string
  order: number
  published: boolean
  /** 'pending' = submitted by parent awaiting admin approval; 'approved' = live; 'rejected' = declined */
  status?: 'pending' | 'approved' | 'rejected'
  submittedByUid?: string
  submittedAt?: string
}
