import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../shared/Button';
import type { TestConnectionResponse } from '../../types/config';

type TestState = 'idle' | 'testing' | 'success' | 'error';

interface TestConnectionButtonProps {
  onTest: () => Promise<TestConnectionResponse>;
  disabled?: boolean;
}

export function TestConnectionButton({ onTest, disabled }: TestConnectionButtonProps) {
  const [state, setState] = useState<TestState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleTest = async () => {
    setState('testing');
    setErrorMessage('');
    try {
      const result = await onTest();
      if (result.success) {
        setState('success');
      } else {
        setState('error');
        setErrorMessage(result.error || 'Connection failed');
      }
    } catch (err: any) {
      setState('error');
      setErrorMessage(err?.response?.data?.detail || err.message || 'Connection failed');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        size="sm"
        loading={state === 'testing'}
        disabled={disabled || state === 'testing'}
        onClick={handleTest}
      >
        {state === 'testing' ? 'Testing...' : 'Test Connection'}
      </Button>

      <AnimatePresence mode="wait">
        {state === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 text-sm text-green-400"
          >
            <CheckCircle size={16} />
            <span>Connected!</span>
          </motion.div>
        )}

        {state === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 text-sm text-red-400"
          >
            <XCircle size={16} />
            <span className="truncate">{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
