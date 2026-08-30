import ForestCanopy from './pages/ForestCanopy'
import ContactUs from './pages/ContactUs'

export default function App() {
  const path = window.location.pathname
  if (path === '/contact') return <ContactUs />
  return <ForestCanopy />
}
