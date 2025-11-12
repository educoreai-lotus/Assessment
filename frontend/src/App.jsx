import { Outlet } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import './App.css';

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-4">
        <Outlet />
      </main>
    </div>
  );
}
