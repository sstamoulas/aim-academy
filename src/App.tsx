import ForestCanopy from './pages/ForestCanopy'
import ContactUs from './pages/ContactUs'
import AnimalsInQuran from './pages/events/AnimalsInQuran'
import WaterSlimeWorkshop from './pages/events/WaterSlimeWorkshop'

export default function App() {
  const path = window.location.pathname
  if (path === '/contact') return <ContactUs />
  if (path === '/events/animals-in-quran') return <AnimalsInQuran />
  if (path === '/events/prophet-yunus-water-slime') return <WaterSlimeWorkshop />
  return <ForestCanopy />
}
