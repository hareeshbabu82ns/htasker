"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function TrackersError( { error, reset }: ErrorProps ) {
  useEffect( () => {
    console.error( "Trackers section error:", error );
  }, [ error ] );

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive mb-3" aria-hidden="true" />
      <h2 className="text-xl font-bold mb-2">Tracker error</h2>
      <p className="text-muted-foreground mb-5 max-w-sm text-sm">
        Unable to load tracker data. This may be a temporary issue — please try again.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground mb-4 font-mono">Error ID: {error.digest}</p>
      )}
      <div className="flex gap-3">
        <Button size="sm" onClick={reset}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          Retry
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/trackers">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            All Trackers
          </Link>
        </Button>
      </div>
    </div>
  );
}
