// components/alerts/AlertLoadingState.tsx
import { Card } from '@/components/ui';

interface AlertLoadingStateProps {
  compact?: boolean;
  className?: string;
}

export function AlertLoadingState({ compact, className = '' }: AlertLoadingStateProps) {
  if (compact) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
          <span className="text-sm text-muted-foreground">Загрузка алертов...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-8 text-center ${className}`}>
      <div className="flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <div className="text-lg font-medium mb-2">Загрузка алертов</div>
        <div className="text-muted-foreground">
          Получаем информацию о проблемах и аномалиях...
        </div>
      </div>
    </Card>
  );
}