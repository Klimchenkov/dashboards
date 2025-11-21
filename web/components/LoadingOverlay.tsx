// components/LoadingOverlay.tsx
interface LoadingOverlayProps {
  progress?: number;
  message?: string;
}

export function LoadingOverlay({ progress = 0, message = "Загружаем данные..." }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-6 shadow-lg max-w-md w-full mx-4">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <div className="flex-1">
            <p className="text-sm font-medium mb-2">{message}</p>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary rounded-full h-2 transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{progress}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}