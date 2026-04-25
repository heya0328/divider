import { useState } from 'react';
import { Spacing, TextField, Button, Checkbox, ListRow, Text } from '@toss/tds-mobile';
import { adaptive } from '@toss/tds-colors';
import { REWARD_TEMPLATES } from '../constants';

interface RewardPickerProps {
  onSelect: (reward: { type: 'template' | 'custom'; key?: string; text?: string } | null) => void;
  optional?: boolean;
}

export default function RewardPicker({ onSelect, optional = true }: RewardPickerProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleSelectTemplate = (key: string) => {
    setSelectedKey(key);
    setUseCustom(false);
    onSelect({ type: 'template', key });
  };

  const handleSelectCustom = () => {
    setUseCustom(true);
    setSelectedKey(null);
    if (customText.trim()) {
      onSelect({ type: 'custom', text: customText.trim() });
    } else {
      onSelect(null);
    }
  };

  const handleCustomTextChange = (value: string) => {
    setCustomText(value);
    if (value.trim()) {
      onSelect({ type: 'custom', text: value.trim() });
    } else {
      onSelect(null);
    }
  };

  const handleClear = () => {
    setSelectedKey(null);
    setUseCustom(false);
    setCustomText('');
    onSelect(null);
  };

  const selectedLabel = (() => {
    if (selectedKey) {
      const t = REWARD_TEMPLATES.find(r => r.key === selectedKey);
      return t ? `${t.emoji} ${t.label}` : null;
    }
    if (useCustom && customText.trim()) return `✍️ ${customText.trim()}`;
    return null;
  })();

  if (!expanded) {
    return (
      <div>
        {selectedLabel ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', backgroundColor: adaptive.blue50, borderRadius: '12px',
          }}>
            <Text typography="t6" color={adaptive.blue500} fontWeight="medium">{selectedLabel}</Text>
            <Button size="small" color="light" variant="fill" onClick={() => setExpanded(true)}>
              변경
            </Button>
          </div>
        ) : (
          <Button
            size="medium"
            display="full"
            color="light"
            variant="weak"
            onClick={() => setExpanded(true)}
          >
            보상 설정하기 (선택)
          </Button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text typography="t6" fontWeight="bold" color={adaptive.grey900}>보상 선택</Text>
        {optional && (
          <Button size="small" color="light" variant="fill" onClick={() => { handleClear(); setExpanded(false); }}>
            건너뛰기
          </Button>
        )}
      </div>
      <Spacing size={8} />

      <div style={{ borderRadius: '12px', overflow: 'hidden', border: `1px solid ${adaptive.grey200}` }}>
        {REWARD_TEMPLATES.map((template) => {
          const isSelected = !useCustom && selectedKey === template.key;
          return (
            <ListRow
              key={template.key}
              onClick={() => handleSelectTemplate(template.key)}
              withTouchEffect
              border="none"
              verticalPadding="small"
              horizontalPadding="small"
              left={<span style={{ fontSize: '22px', flexShrink: 0 }}>{template.emoji}</span>}
              contents={
                <ListRow.Texts
                  type="2RowTypeA"
                  top={template.label}
                  topProps={{ color: isSelected ? adaptive.blue500 : adaptive.grey900, fontWeight: isSelected ? 'bold' : 'medium' }}
                  bottom=" "
                />
              }
              right={
                <Checkbox.Circle
                  inputType="radio"
                  checked={isSelected}
                  onCheckedChange={() => handleSelectTemplate(template.key)}
                  size={20}
                />
              }
              style={{
                backgroundColor: isSelected ? adaptive.blue50 : '#fff',
                borderBottom: `1px solid ${adaptive.grey100}`,
              }}
            />
          );
        })}

        {/* Custom */}
        <ListRow
          onClick={handleSelectCustom}
          withTouchEffect
          border="none"
          verticalPadding="small"
          horizontalPadding="small"
          left={<span style={{ fontSize: '22px', flexShrink: 0 }}>✍️</span>}
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="직접 입력"
              topProps={{ color: useCustom ? adaptive.blue500 : adaptive.grey900, fontWeight: useCustom ? 'bold' : 'medium' }}
              bottom=" "
            />
          }
          right={
            <Checkbox.Circle
              inputType="radio"
              checked={useCustom}
              onCheckedChange={handleSelectCustom}
              size={20}
            />
          }
          style={{
            backgroundColor: useCustom ? adaptive.blue50 : '#fff',
          }}
        />
      </div>

      {useCustom && (
        <>
          <Spacing size={8} />
          <TextField
            variant="box"
            placeholder="예: 주말에 영화 보러 가기"
            value={customText}
            onChange={(e) => handleCustomTextChange(e.target.value)}
          />
        </>
      )}
    </div>
  );
}
