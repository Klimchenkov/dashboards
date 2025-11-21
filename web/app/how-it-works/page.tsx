import { hints } from '@/lib/hints';

export default function HowItWorks() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">ℹ️ Как посчитано</h1>
      <p className="text-lg">
        Эта страница описывает формулы и принципы расчётов: Capacity, Demand, Forecast, Load%, Data Quality Score и правила алертов.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Основные метрики</h2>
          {(['avgLoad', 'activeUsers', 'activeProjects', 'dataQuality'] as const).map(key => (
            <div key={key} className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-2">{hints[key].title}</h3>
              <p className="text-gray-600 mb-2">{hints[key].description}</p>
              <div className="bg-gray-50 p-3 rounded">
                <strong>Формула:</strong>
                <div className="font-mono text-sm mt-1">{hints[key].formula}</div>
              </div>
              <p className="text-sm mt-2 whitespace-pre-line">{hints[key].details}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Базовые формулы</h2>
          {(['capacity', 'demand', 'forecast', 'loadPct'] as const).map(key => (
            <div key={key} className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-2">{hints[key].title}</h3>
              <p className="text-gray-600 mb-2">{hints[key].description}</p>
              <div className="bg-gray-50 p-3 rounded">
                <strong>Формула:</strong>
                <div className="font-mono text-sm mt-1">{hints[key].formula}</div>
              </div>
              <p className="text-sm mt-2">{hints[key].details}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-2xl mb-4">📊 Детальный разбор Data Quality Score</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-lg mb-3">Компоненты оценки:</h4>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold">📊 Покрытие норм (30%)</span>
                  <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Высокая важность</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Наличие рабочих норм у активных сотрудников</p>
                <ul className="text-xs space-y-1">
                  <li>• <strong>Формула:</strong> Кол-во сотрудников с нормами / Все активные сотрудники</li>
                  <li>• <strong>Влияет на:</strong> Расчет Capacity, точность планирования</li>
                  <li>• <strong>Как улучшить:</strong> Назначить нормы в разделе "Нормы сотрудников"</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg border">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold">⏱️ Заполнение фактов (25%)</span>
                  <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Высокая важность</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Полнота учета фактического рабочего времени</p>
                <ul className="text-xs space-y-1">
                  <li>• <strong>Формула:</strong> Дни с таймшитами / Общее рабочие дни</li>
                  <li>• <strong>Влияет на:</strong> Расчет Demand, анализ загрузки</li>
                  <li>• <strong>Как улучшить:</strong> Ежедневное заполнение таймшитов сотрудниками</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg border">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold">📋 Покрытие планов (20%)</span>
                  <span className="text-sm bg-orange-100 text-orange-800 px-2 py-1 rounded">Средняя важность</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Наличие планов по часам для проектов и сотрудников</p>
                <ul className="text-xs space-y-1">
                  <li>• <strong>Формула:</strong> (Проекты с планами + Сотрудники с планами) / 2</li>
                  <li>• <strong>Влияет на:</strong> Расчет Forecast, прогнозирование</li>
                  <li>• <strong>Как улучшить:</strong> Создать планы для всех активных проектов</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-3">Дополнительные метрики:</h4>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold">🗂️ Полнота проектов (15%)</span>
                  <span className="text-sm bg-orange-100 text-orange-800 px-2 py-1 rounded">Средняя важность</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Заполненность данных проектов</p>
                <ul className="text-xs space-y-1">
                  <li>• <strong>Формула:</strong> Средний % заполнения полей проектов</li>
                  <li>• <strong>Поля:</strong> Название, даты начала/окончания, тип проекта</li>
                  <li>• <strong>Как улучшить:</strong> Заполнить данные всех активных проектов</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg border">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold">🔄 Актуальность данных (10%)</span>
                  <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">Низкая важность</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Свежесть и регулярность обновления данных</p>
                <ul className="text-xs space-y-1">
                  <li>• <strong>Формула:</strong> Дни с обновлениями / Дни в периоде</li>
                  <li>• <strong>Влияет на:</strong> Достоверность всех расчетов</li>
                  <li>• <strong>Как улучшить:</strong> Регулярное ежедневное обновление данных</li>
                </ul>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
              <h4 className="font-semibold text-lg mb-2">🎯 Рекомендации по улучшению</h4>
              <ul className="text-sm space-y-2">
                <li>• <strong>Приоритет 1:</strong> Добейтесь 100% покрытия норм у активных сотрудников</li>
                <li>• <strong>Приоритет 2:</strong> Внедрите ежедневное заполнение таймшитов</li>
                <li>• <strong>Приоритет 3:</strong> Создайте планы для всех активных проектов</li>
                <li>• <strong>Целевой показатель:</strong> Data Quality ≥ 85%</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold text-lg mb-2">Техническая информация</h3>
        <p className="text-sm text-gray-600">
          Подробные формулы и тесты см. в <code className="bg-gray-100 px-1 rounded">lib/calc.ts</code>,{' '}
          <code className="bg-gray-100 px-1 rounded">lib/quality.ts</code> и{' '}
          <code className="bg-gray-100 px-1 rounded">tests/formulas.test.ts</code>.
        </p>
      </div>
    </div>
  );
}