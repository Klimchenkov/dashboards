// app/auth/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';


export default function AuthPage() {
  const [telegramName, settelegramName] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'id' | 'code'>('id');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Проверяем, есть ли уже аутентификация
    const userId = localStorage.getItem('userId');
    if (userId && process.env.NEXT_PUBLIC_NODE_ENV === 'production') {
      router.push('/');
    }
  }, [router]);

  const handleSendCode = async () => {
    if (!telegramName.trim()) {
      setError('Введите Telegram Username');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramName: telegramName.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep('code');
        setSuccess('Код отправлен в ваш Telegram! Проверьте сообщения.');
        console.log(`Code sent to Telegram Username: ${telegramName}`);
      } else {
        setError(data.error || 'Ошибка при отправке кода');
        console.log(`Failed to send code: ${data.error}`);
      }
    } catch (err) {
      setError('Ошибка сети. Попробуйте снова.');
      console.log('Network error in send code:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      setError('Введите код подтверждения');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.userData) {
        // Сохраняем данные пользователя
        localStorage.setItem('userId', data.userData.id.toString());
        localStorage.setItem('userData', JSON.stringify(data.userData));
        
        setSuccess('Успешная аутентификация! Перенаправляем...');
        console.log(`User authenticated: ${data.userData.id}`);
        
        // Перенаправляем на главную страницу
        setTimeout(() => {
          router.push('/');
        }, 1000);
      } else {
        setError(data.error || 'Неверный код');
        console.log(`Failed to verify code: ${data.error}`);
      }
    } catch (err) {
      setError('Ошибка сети. Попробуйте снова.');
      console.log('Network error in verify code:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('id');
    setCode('');
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            SETTERS Dashboard
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Аутентификация через Telegram
          </p>
        </div>
        
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {step === 'id' ? (
            <div className="space-y-6">
              <div>
                <label htmlFor="telegramName" className="block text-sm font-medium text-gray-700">
                  Ваш Telegram Username
                </label>
                <div className="mt-1">
                  <input
                    id="telegramName"
                    name="telegramName"
                    type="text"
                    required
                    value={telegramName}
                    onChange={(e) => settelegramName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Введите ваш Telegram Username"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Убедитесь, что ваш Telegram Username корректный и вы есть в базе SETTERS
                </p>
              </div>

              <div>
                <button
                  onClick={handleSendCode}
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Отправка...' : 'Получить код в Telegram'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                  Код подтверждения
                </label>
                <div className="mt-1">
                  <input
                    id="code"
                    name="code"
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Введите 6-значный код"
                    maxLength={6}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Код отправлен в ваш Telegram. Действителен 3 минуты.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleReset}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Назад
                </button>
                <button
                  onClick={handleVerifyCode}
                  disabled={loading}
                  className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Проверка...' : 'Подтвердить'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {success && (
            <div className="mt-4 rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-700">{success}</div>
            </div>
          )}

          {process.env.NEXT_PUBLIC_NODE_ENV === 'development' && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-md">
              <p className="text-sm text-yellow-700">
                <strong>Режим разработки:</strong> Аутентификация отключена
              </p>
              <button
                onClick={() => {
                  localStorage.setItem('userId', 'demo-user-123');
                  localStorage.setItem('userData', JSON.stringify({
                    id: 123,
                    telegram_id: 123456789,
                    name: 'Demo User',
                    full_access: true,
                    lead_departments: [1],
                    lead_projects: [1]
                  }));
                  router.push('/');
                }}
                className="mt-2 text-sm text-blue-600 hover:text-blue-500"
              >
                Войти как демо-пользователь
              </button>
            </div>
          )}
        </div>

        <div className="text-center text-xs text-gray-500">
          © SETTERS · Resource Dashboard
        </div>
      </div>
    </div>
  );
}