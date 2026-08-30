import ForestCanopy from './pages/ForestCanopy'
import ContactUs from './pages/ContactUs'
import Admin from './pages/Admin'
import EventPage from './pages/EventPage'
import TeacherPortal from './pages/TeacherPortal'

export default function App() {
  const path = window.location.pathname
  if (path === '/contact') return <ContactUs />
  if (path === '/admin') return <Admin />
  if (path === '/portal/teacher') return <TeacherPortal />
  if (path.startsWith('/events/')) {
    const slug = path.replace('/events/', '')
    return <EventPage slug={slug} />
  }
  return <ForestCanopy />
}
