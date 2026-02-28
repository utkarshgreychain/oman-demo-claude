import { Dropdown } from '../shared/Dropdown';

interface ModelSelectorProps {
  models: string[];
  value: string | null;
  onChange: (model: string) => void;
  label?: string;
}

export function ModelSelector({ models, value, onChange, label }: ModelSelectorProps) {
  const options = models.map((model) => ({
    value: model,
    label: model,
  }));

  return (
    <Dropdown
      options={options}
      value={value || ''}
      onChange={onChange}
      placeholder="Select a model"
      label={label}
    />
  );
}
