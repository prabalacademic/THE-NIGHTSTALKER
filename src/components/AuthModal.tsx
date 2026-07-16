import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: username });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-700 p-6 rounded-xl w-full max-w-sm shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-4">{isLogin ? 'Login' : 'Sign Up'}</h2>
        {!isLogin && (
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-zinc-800 text-white p-2 rounded mb-3 border border-zinc-700"
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-zinc-800 text-white p-2 rounded mb-3 border border-zinc-700"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-zinc-800 text-white p-2 rounded mb-4 border border-zinc-700"
          required
        />
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700">
          {isLogin ? 'Login' : 'Sign Up'}
        </button>
        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="w-full text-zinc-400 text-sm mt-3 hover:text-white"
        >
          {isLogin ? 'Need an account? Sign Up' : 'Have an account? Login'}
        </button>
        <button type="button" onClick={onClose} className="w-full text-zinc-600 text-xs mt-4 hover:text-zinc-400">Close</button>
      </form>
    </div>
  );
}
