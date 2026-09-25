import { NavLink } from 'react-router-dom'

export default function NavBar() {
  return (
    <header className="navbar">
      <NavLink to="/" className="navbar-brand">
        🎁 GiveShare
      </NavLink>
      <nav className="navbar-links">
        <NavLink to="/" end>
          Browse
        </NavLink>
        <NavLink to="/post" end>
          Give an item
        </NavLink>
        <NavLink to="/post?type=request">Request an item</NavLink>
        <NavLink to="/my-stuff">My stuff</NavLink>
      </nav>
    </header>
  )
}
