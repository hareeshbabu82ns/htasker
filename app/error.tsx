"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home } from "lucide-react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error( { error, reset }: ErrorProps ) {
  useEffect( () => {
    console.error( "Application error:", error );
  }, [ error ] );

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive mb-4" aria-hidden="true" />
      <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        An unexpected error occurred. Please try again. If the problem persists, contact support.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground mb-4 font-mono">Error ID: {error.digest}</p>
      )}
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <Home className="h-4 w-4 mr-2" aria-hidden="true" />
            Go to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
