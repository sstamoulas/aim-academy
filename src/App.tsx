import ForestCanopy from './pages/ForestCanopy'
import ContactUs from './pages/ContactUs'
import Admin from './pages/Admin'
import AnimalsInQuran from './pages/events/AnimalsInQuran'
import WaterSlimeWorkshop from './pages/events/WaterSlimeWorkshop'
import EventPage from './pages/EventPage'

export default function App() {
  const path = window.location.pathname
  if (path === '/contact') return <ContactUs />
  if (path === '/admin') return <Admin />
  if (path === '/events/animals-in-quran') return <AnimalsInQuran />
  if (path === '/events/prophet-yunus-water-slime') return <WaterSlimeWorkshop />
  if (path.startsWith('/events/')) {
    const slug = path.replace('/events/', '')
    return <EventPage slug={slug} />
  }
  return <ForestCanopy />
}
