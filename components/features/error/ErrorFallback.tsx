import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ErrorFallbackProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export default function ErrorFallback( {
  title = "Failed to load",
  description = "Something went wrong while loading this section.",
  onRetry,
  compact = false,
}: ErrorFallbackProps ) {
  if ( compact ) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-2">
          <span>{description}</span>
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry} className="shrink-0">
              <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center" role="alert" aria-live="assertive">
      <AlertTriangle className="h-10 w-10 text-destructive mb-3" aria-hidden="true" />
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm mb-4 max-w-sm">{description}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  );
}
