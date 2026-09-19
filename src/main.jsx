import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import EuxGBoardroom from './EuxGBoardroom.jsx'

// The URL picks the room: /eux-g-boardroom shows the boardroom,
// anything else shows the Newton Room.
const path = window.location.pathname.toLowerCase()
const Room = path.startsWith('/eux-g-boardroom') ? EuxGBoardroom : App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Room />
  </StrictMode>,
)
