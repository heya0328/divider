import { useState } from 'react';
import { Paragraph, Spacing, TextField, Button, Checkbox, ListRow } from '@toss/tds-mobile';
import { REWARD_TEMPLATES } from '../constants';

interface RewardPickerProps {
  onSelect: (reward: { type: 'template' | 'custom'; key?: string; text?: string } | null) => void;
  /** 선택 취소 가능 여부 */
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

  // 현재 선택된 보상 요약 텍스트
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
            padding: '12px 16px', backgroundColor: '#eff6ff', borderRadius: '10px',
          }}>
            <Paragraph typography="t6" color="#3182f6" fontWeight="medium">
              <Paragraph.Text>{selectedLabel}</Paragraph.Text>
            </Paragraph>
            <Button size="small" color="light" variant="weak" onClick={() => setExpanded(true)}>
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
        <Paragraph typography="t6" fontWeight="semibold" color="#374151">
          <Paragraph.Text>보상 선택</Paragraph.Text>
        </Paragraph>
        {optional && (
          <Button size="small" color="light" variant="weak" onClick={() => { handleClear(); setExpanded(false); }}>
            건너뛰기
          </Button>
        )}
      </div>
      <Spacing size={8} />

      <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
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
                <Paragraph typography="t6" fontWeight={isSelected ? 'semibold' : 'medium'} color={isSelected ? '#3182f6' : '#111827'}>
                  <Paragraph.Text>{template.label}</Paragraph.Text>
                </Paragraph>
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
                backgroundColor: isSelected ? '#eff6ff' : '#fff',
                borderBottom: '1px solid #f3f4f6',
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
            <Paragraph typography="t6" fontWeight={useCustom ? 'semibold' : 'medium'} color={useCustom ? '#3182f6' : '#111827'}>
              <Paragraph.Text>직접 입력</Paragraph.Text>
            </Paragraph>
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
            backgroundColor: useCustom ? '#eff6ff' : '#fff',
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
