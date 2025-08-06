import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PlaylistsView } from './components/PlaylistsView';
import { PackagesView } from './components/PackagesView';
import { SettingsView } from './components/SettingsView';
import './App.css'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<PlaylistsView />} />
          <Route path="/playlists" element={<PlaylistsView />} />
          <Route path="/packages" element={<PackagesView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
