"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function SecuredError( { error, reset }: ErrorProps ) {
  useEffect( () => {
    console.error( "Secured section error:", error );
  }, [ error ] );

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive mb-4" aria-hidden="true" />
      <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        An error occurred while loading this page. Your data is safe — please try again.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground mb-4 font-mono">Error ID: {error.digest}</p>
      )}
      <div className="flex gap-3">
        <Button onClick={reset}>
          <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
          Try again
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
