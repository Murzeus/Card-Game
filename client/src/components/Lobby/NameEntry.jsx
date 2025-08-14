// src/components/Lobby/NameEntry.jsx
import { useState } from 'react';

export function NameEntry({ onJoin }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onJoin(name.trim());
    }
  };

  return (
    <div className="name-entry-container">
      <h2>Join the Game Lobby</h2>
      <form onSubmit={handleSubmit} className="name-entry-form">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          required
          className="name-input"
        />
        <button type="submit" className="join-button">
          Join
        </button>
      </form>
    </div>
  );
}