// components/alerts/AlertErrorState.tsx
import { Card, Button } from '@/components/ui';

interface AlertErrorStateProps {
  error: string;
  onRetry: () => void;
  compact?: boolean;
  className?: string;
}

export function AlertErrorState({ error, onRetry, compact, className = '' }: AlertErrorStateProps) {
  if (compact) {
    return (
      <Card className={`p-3 border-destructive/20 ${className}`}>
        <div className="text-destructive text-sm text-center">
          Ошибка загрузки
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRetry}
          className="w-full mt-2"
        >
          Повторить
        </Button>
      </Card>
    );
  }

  return (
    <Card className={`p-6 border-destructive/20 ${className}`}>
      <div className="text-center">
        <div className="text-destructive text-lg font-medium mb-2">
          Ошибка загрузки алертов
        </div>
        <div className="text-muted-foreground mb-4 text-sm">
          {error}
        </div>
        <Button onClick={onRetry}>
          Попробовать снова
        </Button>
      </div>
    </Card>
  );
}