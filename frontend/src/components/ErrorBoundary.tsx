import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

type Props = {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
};

type State = { error: Error | null };

/**
 * Catches render-phase errors anywhere below it and shows a recoverable shell
 * instead of a white-screen. Effect/async errors still escape — those belong to
 * React Query / event handlers / the Supabase client, all of which handle their
 * own failures.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary] uncaught render error:", error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div className="grid min-h-screen place-items-center bg-white px-6">
        <div className="w-full max-w-md">
          <Card lift>
            <CardBody>
              <h1 className="text-[24px] font-semibold leading-tight tracking-[var(--tracking-card)] text-foreground">
                Something went wrong
              </h1>
              <p className="mt-2 text-[14px] text-gray-600">
                {error.message || "An unexpected error occurred while rendering this view."}
              </p>
              <div className="mt-5 flex gap-2">
                <Button onClick={this.reset}>Try again</Button>
                <Button variant="secondary" onClick={() => window.location.reload()}>
                  Reload
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }
}
