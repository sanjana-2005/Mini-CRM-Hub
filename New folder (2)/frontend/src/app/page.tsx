'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}

export default function Home() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isGoogleScriptLoaded, setIsGoogleScriptLoaded] = useState(false);

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    const checkGoogleScript = () => {
      if (window.google?.accounts?.id) {
        setIsGoogleScriptLoaded(true);
        initializeGoogleSignIn();
      }
    };

    checkGoogleScript();
    const timeoutId = setTimeout(checkGoogleScript, 1000);
    return () => clearTimeout(timeoutId);
  }, []);

  const initializeGoogleSignIn = () => {
    try {
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: async (response: any) => {
          try {
            await signIn(response.credential);
            toast({ title: 'Success', description: 'Successfully signed in with Google' });
          } catch (error) {
            console.error('Sign in failed:', error);
            toast({
              title: 'Error',
              description: 'Failed to sign in with Google',
              variant: 'destructive',
            });
          }
        },
      });

      const buttonElement = document.getElementById('googleSignIn');
      if (buttonElement) {
        window.google.accounts.id.renderButton(buttonElement, {
          theme: 'outline',
          size: 'large',
          width: 250,
        });
      }
    } catch (error) {
      console.error('Error initializing Google Sign-In:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize Google Sign-In',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-background" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <div className="mb-6 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            🚀 Welcome to the Future of CRM
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Welcome to <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Mini CRM</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            A modern CRM platform that helps you manage customer relationships, create targeted campaigns, and drive business growth with AI-powered insights.
          </p>
        </div>

        <div className="mb-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'Smart Segmentation', description: 'Group customers intelligently based on behavior and preferences', icon: '🎯' },
            { title: 'Campaign Tools', description: 'Create and track marketing campaigns with ease', icon: '📈' },
            { title: 'AI Insights', description: 'Get intelligent recommendations and analytics', icon: '🤖' },
            { title: 'Real-time Analytics', description: 'Monitor your CRM performance in real-time', icon: '📊' },
          ].map((feature, index) => (
            <div key={index} className="group relative rounded-xl border bg-card p-6 transition-all hover:shadow-lg">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="mb-4 text-3xl">{feature.icon}</div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="group relative overflow-hidden transition-all hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Why Choose Mini CRM?</CardTitle>
              <CardDescription>
                Everything you need to manage your customer relationships effectively
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-4">
                {[
                  { title: 'Customer Segmentation', description: 'Smart grouping of customers based on behavior and preferences', icon: '🎯' },
                  { title: 'Campaign Management', description: 'Create and track marketing campaigns with ease', icon: '📈' },
                  { title: 'AI-Powered Insights', description: 'Get intelligent recommendations and analytics', icon: '🤖' },
                  { title: 'Real-time Analytics', description: 'Monitor your CRM performance in real-time', icon: '📊' },
                ].map((feature, index) => (
                  <li key={index} className="flex items-start space-x-4">
                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">{feature.icon}</div>
                    <div>
                      <h4 className="font-medium">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden transition-all hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Get Started Today</CardTitle>
              <CardDescription>
                Join thousands of businesses using Mini CRM to grow their customer relationships
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <div id="googleSignIn" className="transform transition-transform hover:scale-105" />
                {!isGoogleScriptLoaded && (
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Loading Google Sign-In...</p>
                  </div>
                )}
                <p className="text-center text-sm text-muted-foreground">
                  Sign in with your Google account to get started
                </p>
              </div>
              <div className="mt-6 rounded-lg bg-primary/5 p-4">
                <h4 className="mb-2 font-medium">What's included:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center space-x-2"><span className="text-primary">✓</span><span>Free 14-day trial</span></li>
                  <li className="flex items-center space-x-2"><span className="text-primary">✓</span><span>No credit card required</span></li>
                  <li className="flex items-center space-x-2"><span className="text-primary">✓</span><span>Full access to all features</span></li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
