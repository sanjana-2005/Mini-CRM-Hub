'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  name: string;
}

interface Campaign {
  id: string;
  name: string;
  description: string;
  message: string;
  status: string;
  scheduledFor: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  campaigns: Campaign[] | null;
  signIn: (credential?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setLoading(false);
      fetchCampaigns(token); // Fetch campaigns if a token exists (on page load or after login)
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch campaigns after successful login
  const fetchCampaigns = async (token: string) => {
    try {
      const response = await axios.get('/api/campaigns', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCampaigns(response.data); // Set campaigns after fetching
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const signIn = async (credential?: string) => {
    try {
      if (!credential) {
        throw new Error('No credential provided');
      }

      // For now, mock user creation (replace with actual login logic)
      const mockUser = {
        id: '1',
        email: 'user@example.com',
        name: 'Test User',
      };

      setUser(mockUser);
      const token = 'mock-token'; // Get this from actual login logic
      localStorage.setItem('token', token);
      fetchCampaigns(token); // Fetch campaigns after login
      router.push('/dashboard');
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    localStorage.removeItem('token');
    setUser(null);
    setCampaigns(null); // Clear campaigns on logout
    router.push('/'); // Redirect to homepage or login page
  };

  return (
    <AuthContext.Provider value={{ user, loading, campaigns, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}