"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const [ name, setName ] = useState( "" );
  const [ email, setEmail ] = useState( "" );
  const [ password, setPassword ] = useState( "" );
  const [ isLoading, setIsLoading ] = useState( false );
  const [ error, setError ] = useState( "" );
  const router = useRouter();

  const handleSubmit = async ( e: React.FormEvent ) => {
    e.preventDefault();
    setIsLoading( true );
    setError( "" );

    try {
      // In a real application, this would be an API call to register a user
      // For now, we'll simulate a successful registration
      await new Promise( ( resolve ) => setTimeout( resolve, 1000 ) );

      // Redirect to dashboard after "registration"
      router.push( "/dashboard" );
    } catch ( err ) {
      setError( "Registration failed. Please try again." );
      console.error( err );
    } finally {
      setIsLoading( false );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-8 bg-background border border-border p-6 rounded-lg shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="mt-2 text-foreground/70">
            Sign up to start tracking everything important to you
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={( e ) => setName( e.target.value )}
              className="w-full border border-border rounded-md p-2 focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={( e ) => setEmail( e.target.value )}
              className="w-full border border-border rounded-md p-2 focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={( e ) => setPassword( e.target.value )}
              className="w-full border border-border rounded-md p-2 focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <p className="mt-1 text-xs text-foreground/70">
              Password must be at least 8 characters long and include a number and symbol
            </p>
          </div>

          <div>
            <Button
              type="submit"
              fullWidth
              disabled={isLoading}
              className="relative"
            >
              {isLoading ? "Creating account..." : "Sign up"}
            </Button>
          </div>

          <div className="flex items-center justify-center">
            <div className="text-sm">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary hover:text-primary-hover font-medium"
              >
                Sign in
              </Link>
            </div>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-foreground/70">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              className="flex justify-center items-center w-full border border-border rounded-md p-2 hover:bg-muted"
            >
              <GoogleIcon className="h-5 w-5 mr-2" />
              <span>Google</span>
            </button>
            <button
              type="button"
              className="flex justify-center items-center w-full border border-border rounded-md p-2 hover:bg-muted"
            >
              <GithubIcon className="h-5 w-5 mr-2" />
              <span>GitHub</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-center text-foreground/70">
          By signing up, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:text-primary-hover">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary hover:text-primary-hover">
            Privacy Policy
          </Link>
          .
        </div>
      </div>
    </div>
  );
}

function GoogleIcon( { className = "" } ) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GithubIcon( { className = "" } ) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}