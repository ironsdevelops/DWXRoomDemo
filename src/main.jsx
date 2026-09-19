import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import RoomDemo from './RoomDemo.jsx'
import { ROOMS, DEFAULT_ROOM } from './rooms.js'

// The URL picks the room, for example /eux-g-boardroom. Anything else shows the default room.
const slug = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase()
const room = ROOMS[slug] || ROOMS[DEFAULT_ROOM]

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RoomDemo room={room} />
  </StrictMode>,
)
