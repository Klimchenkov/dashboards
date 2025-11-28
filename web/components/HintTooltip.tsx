'use client';
import { useState } from 'react';
import { hints, HintKey } from '@/lib/hints';

interface HintTooltipProps {
  hintKey: HintKey;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function HintTooltip({ hintKey, position = 'bottom' }: HintTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const hint = hints[hintKey];

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  return (
    <div className="relative inline-block">
      <button
        className="w-4 h-4 rounded-full bg-gray-300 text-gray-600 text-xs flex items-center justify-center hover:bg-gray-400 transition-colors"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        aria-label={`Подсказка: ${hint.title}`}
      >
        ?
      </button>
      
      {isVisible && (
        <div className={`absolute z-50 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg ${positionClasses[position]}`}>
          <div className="font-semibold mb-1">{hint.title}</div>
          <div className="mb-2 opacity-80">{hint.description}</div>
          <div className="mb-1">
            <span className="font-medium">Формула:</span> 
            <div className="text-xs font-mono bg-gray-800 p-1 rounded mt-1">{hint.formula}</div>
          </div>
          <div className="text-xs opacity-90 mt-2">{hint.details}</div>
          
          {/* Стрелка */}
          <div className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
            position === 'top' ? 'top-full -translate-x-1/2 left-1/2 -mt-1' :
            position === 'bottom' ? 'bottom-full -translate-x-1/2 left-1/2 -mb-1' :
            position === 'left' ? 'left-full -translate-y-1/2 top-1/2 -mr-1' :
            'right-full -translate-y-1/2 top-1/2 -ml-1'
          }`} />
        </div>
      )}
    </div>
  );
}