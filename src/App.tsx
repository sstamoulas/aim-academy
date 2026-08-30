import ForestCanopy from './pages/ForestCanopy'
import ContactUs from './pages/ContactUs'
import Admin from './pages/Admin'
import EventPage from './pages/EventPage'

export default function App() {
  const path = window.location.pathname
  if (path === '/contact') return <ContactUs />
  if (path === '/admin') return <Admin />
  if (path.startsWith('/events/')) {
    const slug = path.replace('/events/', '')
    return <EventPage slug={slug} />
  }
  return <ForestCanopy />
}
