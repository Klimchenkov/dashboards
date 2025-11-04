export default function HowItWorks() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-3xl font-bold">ℹ️ Как посчитано</h1>
      <p>Эта страница описывает формулы и принципы расчётов: Capacity, Demand, Forecast, Load%, Data Quality Score и правила алертов.</p>
      <ul className="list-disc pl-6 space-y-2">
        <li><b>Capacity</b> = нормы часов − (праздники + отпуска + больничные + non-working)</li>
        <li><b>Demand</b> = commercial + presale</li>
        <li><b>Forecast</b> — равномерное распределение планов по датам начала/окончания + внутренние часы из норм</li>
        <li><b>Load%</b> = demand / capacity</li>
        <li><b>Data Quality Score</b> — взвешенное среднее: планы (0.4), заполнение фактов (0.3), лаг обновления (0.2), валидность дат/калькуляторов (0.1)</li>
      </ul>
      <p>Подробные формулы и тесты см. в <code>lib/calc.ts</code>, <code>lib/quality.ts</code> и <code>tests/formulas.test.ts</code>.</p>
    </div>
  );
}
