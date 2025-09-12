'use client';

import { jwtDecode, JwtPayload } from 'jwt-decode';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface JWTPayload extends JwtPayload {
  user_id: string;
  type: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface User {
  id: string;
  email: string;
  email_verified?: boolean;
  is_active?: boolean;
  created_at?: string;
  profile?: {
    username: string;
    full_name?: string;
    avatar_url?: string;
    bio?: string;
    location?: string;
    website?: string;
    preferences?: Record<string, unknown>;
  };
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private user: User | null = null;

  constructor() {
    // Load tokens from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token');
      this.refreshToken = localStorage.getItem('refresh_token');

      // Load user info if access token exists and is valid
      if (this.accessToken) {
        try {
          const decoded = jwtDecode<JWTPayload>(this.accessToken);
          if (decoded.exp && decoded.exp * 1000 > Date.now()) {
            this.user = { id: decoded.user_id, email: '' };
          } else {
            // Token expired, clear it
            this.clearTokens();
          }
        } catch (error) {
          console.error('Invalid token:', error);
          this.clearTokens();
        }
      }
    }
  }

  private setTokens(tokens: AuthTokens): void {
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;

    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', tokens.access_token);
      localStorage.setItem('refresh_token', tokens.refresh_token);
    }
  }

  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;

    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  async login(credentials: LoginCredentials): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      this.setTokens(data);

      // Decode user ID from token
      const decoded = jwtDecode<JWTPayload>(data.access_token);
      if (decoded.exp) {
        this.user = { id: decoded.user_id, email: credentials.email };
      }

      // Get full user profile
      await this.loadUserProfile();

      return this.user!;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(credentials: RegisterCredentials): Promise<{ message: string; user_id: string; email_verification_required: boolean }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      // Call logout endpoint
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
    } catch (error) {
      console.error('Logout API call error:', error);
    } finally {
      // Always clear tokens locally
      this.clearTokens();
    }
  }

  async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      this.accessToken = data.access_token;

      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', data.access_token);
      }

      return data.access_token;
    } catch (error) {
      console.error('Token refresh error:', error);
      // Clear tokens if refresh fails
      this.clearTokens();
      throw error;
    }
  }

  async loadUserProfile(): Promise<void> {
    if (!this.accessToken) {
      console.warn('No access token available for profile loading');
      return;
    }

    try {
      let response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        headers: this.getAuthHeaders(),
      });

      // If profile fetch fails due to auth, try refreshing token
      if (!response.ok && response.status === 401) {
        console.log('Profile fetch failed with 401, attempting token refresh');

        try {
          await this.refreshAccessToken();
          console.log('Token refreshed successfully, retrying profile fetch');

          // Retry with new token
          response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
            headers: this.getAuthHeaders(),
          });
        } catch (refreshError) {
          console.error('Token refresh failed, logging out:', refreshError);
          // Only logout if refresh actually fails (not just throws)
          if (this.accessToken === null || !this.isAuthenticated()) {
            await this.logout();
          }
          throw new Error('Session expired, please login again');
        }
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Profile fetch failed with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data || !data.user) {
        throw new Error('Invalid profile data received');
      }

      this.user = data.user;
      if (this.user) {
        console.log('User profile loaded successfully:', { id: this.user.id, email: this.user.email });
      }

    } catch (error) {
      console.error('Profile fetch error:', error);

      // Only logout for authentication-related errors, not network issues
      if (error instanceof Error) {
        if (error.message.includes('Session expired') ||
            error.message.includes('Token refresh failed') ||
            error.message.includes('401:')) {

          if (!this.isAuthenticated()) {
            console.log('Logging out due to authentication failure');
            this.clearTokens();
          }
        }
      }

      // Re-throw the error so calling code can handle it if needed
      throw error;
    }
  }

  async googleLogin(redirectUri?: string): Promise<void> {
    // Redirect to backend Google OAuth endpoint
    window.location.href = `${API_BASE_URL}/api/auth/google/login${
      redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : ''
    }`;
  }

  isAuthenticated(): boolean {
    if (!this.accessToken) return false;

    try {
      const decoded = jwtDecode<JWTPayload>(this.accessToken);
      return decoded.exp ? decoded.exp * 1000 > Date.now() : false;
    } catch {
      return false;
    }
  }

  getUser(): User | null {
    return this.user;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  // Utility method to handle API calls with automatic token refresh
  async apiCall(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = { ...this.getAuthHeaders(), ...(options.headers || {}) };

    let response = await fetch(url, { ...options, headers });

    // If unauthorized, try refreshing token
    if (response.status === 401) {
      try {
        await this.refreshAccessToken();
        const newHeaders = { ...this.getAuthHeaders(), ...(options.headers || {}) };
        response = await fetch(url, { ...options, headers: newHeaders });
      } catch (refreshError) {
        console.error('Refresh token failed:', refreshError);
        this.logout();
        throw new Error('Session expired. Please login again.');
      }
    }

    return response;
  }
}

// Create singleton instance
export const authService = new AuthService();

// React Context and Hooks for component usage
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<{ message: string; user_id: string; email_verification_required: boolean }>;
  googleLogin: (redirectUri?: string) => Promise<void>;
  isAuthenticated: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      // Prevent multiple simultaneous initializations
      if (!setLoading.toString().includes('setLoading')) {
        console.warn('initializeAuth called unexpectedly');
        return;
      }

      try {
        // Add a small delay to ensure DOM is fully loaded
        if (typeof window !== 'undefined') {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const isAuth = authService.isAuthenticated();

        if (isAuth) {
          console.log('User is authenticated, loading profile...');
          await authService.loadUserProfile();
          const currentUser = authService.getUser();

          if (currentUser) {
            console.log('Profile loaded successfully:', { id: currentUser.id, email: currentUser.email });
            setUser(currentUser);
          } else {
            console.warn('Profile loading succeeded but no user data received');
            // Don't logout here as user might still be valid
          }
        } else {
          console.log('User is not authenticated');
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);

        // Only logout for auth-related errors, not network issues
        if (error instanceof Error) {
          if (error.message.includes('Session expired') ||
              error.message.includes('Token refresh failed') ||
              error.message.includes('login again')) {
            console.log('Logging out due to auth failure in initialization');
            await authService.logout();
            setUser(null);
          }
          // For other errors (network, etc.), keep tokens and try again later
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const loggedInUser = await authService.login(credentials);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const register = async (credentials: RegisterCredentials) => {
    return await authService.register(credentials);
  };

  const googleLogin = async (redirectUri?: string) => {
    await authService.googleLogin(redirectUri);
  };

  const isAuthenticated = () => authService.isAuthenticated();

  const contextValue: AuthContextType = {
    user,
    loading,
    login,
    logout,
    register,
    googleLogin,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
