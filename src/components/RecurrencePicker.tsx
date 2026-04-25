import { Spacing, Text, Checkbox, ListRow, Button } from '@toss/tds-mobile';
import { adaptive } from '@toss/tds-colors';
import type { RecurrenceType } from '../types';
import { WEEKDAY_LABELS, NTH_LABELS } from '../constants';

export interface RecurrenceValue {
  type: RecurrenceType;
  days: number[];
  monthlyNth?: number;
  monthlyWeekday?: number;
}

interface RecurrencePickerProps {
  value: RecurrenceValue | null;
  onChange: (value: RecurrenceValue | null) => void;
}

type ModeType = 'none' | 'weekly' | 'monthly';

export default function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const mode: ModeType = value?.type ?? 'none';

  const handleModeChange = (newMode: ModeType) => {
    if (newMode === 'none') {
      onChange(null);
    } else if (newMode === 'weekly') {
      onChange({ type: 'weekly', days: [] });
    } else {
      onChange({ type: 'monthly', days: [], monthlyNth: 1, monthlyWeekday: 0 });
    }
  };

  const toggleDay = (day: number) => {
    if (!value || value.type !== 'weekly') return;
    const days = value.days.includes(day)
      ? value.days.filter(d => d !== day)
      : [...value.days, day].sort();
    onChange({ ...value, days });
  };

  const setMonthlyNth = (nth: number) => {
    if (!value || value.type !== 'monthly') return;
    onChange({ ...value, monthlyNth: nth });
  };

  const setMonthlyWeekday = (weekday: number) => {
    if (!value || value.type !== 'monthly') return;
    onChange({ ...value, monthlyWeekday: weekday });
  };

  const modeOptions: { key: ModeType; label: string }[] = [
    { key: 'none', label: '반복 안 함' },
    { key: 'weekly', label: '매주' },
    { key: 'monthly', label: '매월' },
  ];

  return (
    <div>
      <div style={{ margin: '0 20px', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${adaptive.grey200}` }}>
        {modeOptions.map(option => {
          const selected = mode === option.key;
          return (
            <ListRow
              key={option.key}
              onClick={() => handleModeChange(option.key)}
              withTouchEffect
              border="none"
              horizontalPadding="small"
              left={
                <Checkbox.Circle
                  inputType="radio"
                  checked={selected}
                  onCheckedChange={() => handleModeChange(option.key)}
                  size={22}
                />
              }
              contents={
                <ListRow.Texts
                  type="2RowTypeA"
                  top={option.label}
                  topProps={{ color: selected ? adaptive.blue500 : adaptive.grey900, fontWeight: selected ? 'bold' : 'medium' }}
                  bottom=" "
                />
              }
              style={{
                backgroundColor: selected ? adaptive.blue50 : '#fff',
                borderBottom: `1px solid ${adaptive.grey100}`,
              }}
            />
          );
        })}
      </div>

      {/* 매주: 요일 선택 */}
      {mode === 'weekly' && (
        <>
          <Spacing size={12} />
          <div style={{ padding: '0 20px' }}>
            <Text typography="t7" color={adaptive.grey500}>반복할 요일을 선택하세요</Text>
            <Spacing size={8} />
            <div style={{ display: 'flex', gap: '6px' }}>
              {WEEKDAY_LABELS.map((label, idx) => {
                const selected = value?.days.includes(idx) ?? false;
                return (
                  <Button
                    key={idx}
                    size="small"
                    color={selected ? 'primary' : 'light'}
                    variant={selected ? 'weak' : 'fill'}
                    onClick={() => toggleDay(idx)}
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* 매월: 주차 + 요일 선택 */}
      {mode === 'monthly' && (
        <>
          <Spacing size={12} />
          <div style={{ padding: '0 20px' }}>
            <Text typography="t7" color={adaptive.grey500}>매월 반복할 주차와 요일을 선택하세요</Text>
            <Spacing size={8} />
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              {NTH_LABELS.map((label, idx) => {
                const nth = idx + 1;
                const selected = value?.monthlyNth === nth;
                return (
                  <Button
                    key={nth}
                    size="small"
                    color={selected ? 'primary' : 'light'}
                    variant={selected ? 'weak' : 'fill'}
                    onClick={() => setMonthlyNth(nth)}
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {WEEKDAY_LABELS.map((label, idx) => {
                const selected = value?.monthlyWeekday === idx;
                return (
                  <Button
                    key={idx}
                    size="small"
                    color={selected ? 'primary' : 'light'}
                    variant={selected ? 'weak' : 'fill'}
                    onClick={() => setMonthlyWeekday(idx)}
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
