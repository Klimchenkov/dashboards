// components/alerts/AlertEmptyState.tsx
import { Card, Button } from '@/components/ui';

interface AlertEmptyStateProps {
  onRefresh: () => void;
  compact?: boolean;
  className?: string;
}

export function AlertEmptyState({ onRefresh, compact, className = '' }: AlertEmptyStateProps) {
  if (compact) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="text-center text-muted-foreground text-sm">
          <div className="mb-1">✅</div>
          Нет критических алертов
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-8 text-center ${className}`}>
      <div className="flex flex-col items-center justify-center">
        <div className="text-4xl mb-4">✅</div>
        <div className="text-lg font-medium mb-2">Отлично!</div>
        <div className="text-muted-foreground mb-4">
          На данный момент нет активных алертов в системе
        </div>
        <Button onClick={onRefresh}>
          Проверить снова
        </Button>
      </div>
    </Card>
  );
}