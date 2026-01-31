import type { InputMode } from './types';

type ModeSwitchProps = {
  inputMode: InputMode;
  onModeChange: (mode: InputMode) => void;
};

export function ModeSwitch({ inputMode, onModeChange }: ModeSwitchProps) {
  return (
    <div className="flex justify-center pt-4">
      <button
        type="button"
        onClick={() => onModeChange(inputMode === 'manual' ? 'timer' : 'manual')}
        className="text-sm text-primary underline hover:opacity-80"
      >
        {inputMode === 'manual' ? 'Use a timer' : 'Didn\'t use timer? Manual entry'}
      </button>
    </div>
  );
}
