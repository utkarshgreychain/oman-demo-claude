import { motion } from 'framer-motion';
import { Check, Loader2, FileText, Globe, Sparkles, BarChart3, AlertCircle } from 'lucide-react';
import type { ProgressStep } from '../../types/chat';

interface ThinkingStepsProps {
  steps: ProgressStep[];
}

const STEP_ICONS: Record<string, React.ElementType> = {
  reading_files: FileText,
  analyzing_files: FileText,
  searching_web: Globe,
  generating: Sparkles,
  creating_visualization: BarChart3,
};

function isErrorStep(step: ProgressStep): boolean {
  return step.label.toLowerCase().includes('failed') || (step.detail?.toLowerCase().includes('failed') ?? false);
}

export function ThinkingSteps({ steps }: ThinkingStepsProps) {
  if (steps.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-1.5 py-2"
    >
      {steps.map((step, index) => {
        const Icon = STEP_ICONS[step.step] || Sparkles;
        const isCompleted = step.status === 'completed';
        const isInProgress = step.status === 'in_progress';
        const isError = isCompleted && isErrorStep(step);

        return (
          <motion.div
            key={step.step}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-2"
          >
            {/* Status icon */}
            <div className={`
              shrink-0 w-5 h-5 rounded-full flex items-center justify-center
              ${isError
                ? 'bg-warning/20 text-warning'
                : isCompleted
                  ? 'bg-success/20 text-success'
                  : isInProgress
                    ? 'bg-primary/20 text-primary'
                    : 'bg-surface-light text-text-secondary'
              }
            `}>
              {isError ? (
                <AlertCircle size={12} strokeWidth={3} />
              ) : isCompleted ? (
                <Check size={12} strokeWidth={3} />
              ) : isInProgress ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Icon size={12} />
              )}
            </div>

            {/* Label */}
            <span className={`text-xs ${
              isError
                ? 'text-warning'
                : isCompleted
                  ? 'text-text-secondary'
                  : isInProgress
                    ? 'text-text-primary font-medium'
                    : 'text-text-secondary'
            }`}>
              {step.label}
            </span>

            {/* Detail */}
            {step.detail && isCompleted && (
              <span className={`text-xs truncate max-w-[250px] ${isError ? 'text-warning/70' : 'text-text-secondary/70'}`}>
                — {step.detail}
              </span>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
