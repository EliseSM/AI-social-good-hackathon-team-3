import { Route, Routes } from 'react-router-dom'
import NavBar from './components/NavBar'
import UrgentNeedsBanner from './components/UrgentNeedsBanner'
import BrowsePage from './features/browse/BrowsePage'
import PostItemPage from './features/post-item/PostItemPage'
import ItemDetailPage from './features/item-detail/ItemDetailPage'
import MyStuffPage from './features/my-stuff/MyStuffPage'

export default function App() {
  return (
    <div className="app-shell">
      <NavBar />
      <UrgentNeedsBanner />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<BrowsePage />} />
          <Route path="/post" element={<PostItemPage />} />
          <Route path="/items/:id" element={<ItemDetailPage />} />
          <Route path="/my-stuff" element={<MyStuffPage />} />
        </Routes>
      </main>
    </div>
  )
}
