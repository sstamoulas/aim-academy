import { Routes, Route } from 'react-router-dom'
import Gallery from './pages/Gallery'
import CanopyCampus from './pages/CanopyCampus'
import ForestPath from './pages/ForestPath'
import SunlitStudio from './pages/SunlitStudio'
import WoodgrainAtelier from './pages/WoodgrainAtelier'
import GrowthLoop from './pages/GrowthLoop'
import ForestCanopy from './pages/ForestCanopy'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Gallery />} />
      <Route path="/templates/canopy-campus" element={<CanopyCampus />} />
      <Route path="/templates/forest-path" element={<ForestPath />} />
      <Route path="/templates/sunlit-studio" element={<SunlitStudio />} />
      <Route path="/templates/woodgrain-atelier" element={<WoodgrainAtelier />} />
      <Route path="/templates/growth-loop" element={<GrowthLoop />} />
      <Route path="/templates/forest-canopy" element={<ForestCanopy />} />
    </Routes>
  )
}
