import { useState, useEffect, useCallback } from 'react';
import { Spacing, Top, List, ListRow, ListHeader, Text, TableRow, Badge, useDialog } from '@toss/tds-mobile';
import { adaptive } from '@toss/tds-colors';
import { useApp } from '../../context/AppContext';
import { getCoupleInfo } from '../../data/couples';
import { getTemplatesByCouple, toggleTemplate, deleteTemplate } from '../../data/choreTemplates';
import { WEEKDAY_LABELS, NTH_LABELS } from '../../constants';
import BottomTab from '../../components/BottomTab';
import type { Couple, ChoreTemplate } from '../../types';

export default function MyPage() {
  const { user, partner } = useApp();
  const dialog = useDialog();
  const [couple, setCouple] = useState<Couple | null>(null);
  const [templates, setTemplates] = useState<ChoreTemplate[]>([]);

  const loadCouple = useCallback(async () => {
    if (!user?.couple_id) return;
    try {
      const [coupleData, templateData] = await Promise.all([
        getCoupleInfo(user.couple_id),
        getTemplatesByCouple(user.couple_id),
      ]);
      setCouple(coupleData);
      setTemplates(templateData);
    } catch {
      /* ignore */
    }
  }, [user?.couple_id]);

  useEffect(() => {
    loadCouple();
  }, [loadCouple]);

  if (!user) return null;

  const isUserA = couple?.user_a_id === user.id;
  const matchedDate = couple?.matched_at
    ? new Date(couple.matched_at).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  const handleToggleTemplate = async (t: ChoreTemplate) => {
    try {
      const updated = await toggleTemplate(t.id, !t.is_active);
      setTemplates(prev => prev.map(item => item.id === updated.id ? updated : item));
    } catch { /* ignore */ }
  };

  const handleDeleteTemplate = async (t: ChoreTemplate) => {
    const confirmed = await dialog.openConfirm({
      title: '반복 일정을 삭제할까요?',
      description: `'${t.title}' 반복을 삭제합니다. 이미 생성된 할 일은 유지돼요.`,
      confirmButton: '삭제',
      cancelButton: '취소',
    });
    if (!confirmed) return;
    try {
      await deleteTemplate(t.id);
      setTemplates(prev => prev.filter(item => item.id !== t.id));
    } catch { /* ignore */ }
  };

  const formatRecurrence = (t: ChoreTemplate): string => {
    if (t.recurrence_type === 'weekly') {
      const days = t.recurrence_days.map(d => WEEKDAY_LABELS[d]).join('/');
      return `매주 ${days}`;
    }
    if (t.monthly_nth != null && t.monthly_weekday != null) {
      return `매월 ${NTH_LABELS[t.monthly_nth - 1]} ${WEEKDAY_LABELS[t.monthly_weekday]}`;
    }
    return '매월';
  };

  const handleReset = async () => {
    const confirmed = await dialog.openConfirm({
      title: '초기화하시겠어요?',
      description: '로컬 데이터를 초기화하고 새 사용자로 시작합니다.',
      confirmButton: '초기화',
      cancelButton: '취소',
    });
    if (confirmed) {
      localStorage.removeItem('divider_dev_user_id');
      window.location.href = '/';
    }
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
      <Top
        title={
          <Top.TitleParagraph size={22} color={adaptive.grey900}>
            마이페이지
          </Top.TitleParagraph>
        }
      />

      {/* 프로필 영역 */}
      <div style={{
        margin: '0 20px',
        padding: '24px 20px',
        backgroundColor: adaptive.grey50,
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '24px',
          backgroundColor: adaptive.blue100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px',
        }}>
          {user.nickname.charAt(0)}
        </div>
        <div>
          <Text typography="t5" fontWeight="bold" color={adaptive.grey900}>{user.nickname}</Text>
          {partner && (
            <Text display="block" typography="t7" color={adaptive.grey500}>
              {`${partner.nickname}님과 함께`}
            </Text>
          )}
        </div>
      </div>

      <Spacing size={8} />

      {/* 워크스페이스 정보 */}
      <ListHeader
        title={
          <ListHeader.TitleParagraph typography="t5" color={adaptive.grey900} fontWeight="bold">
            워크스페이스
          </ListHeader.TitleParagraph>
        }
      />
      <div style={{ padding: '0 20px' }}>
        <div style={{
          backgroundColor: adaptive.grey50,
          borderRadius: '16px',
          padding: '16px 20px',
        }}>
          <TableRow
            align="space-between"
            left={<Text typography="t6" color={adaptive.grey500}>초대코드</Text>}
            right={
              <Text typography="t6" fontWeight="bold" color={adaptive.grey900}>
                {couple?.invite_code ?? '-'}
              </Text>
            }
          />
          <Spacing size={12} />
          <TableRow
            align="space-between"
            left={<Text typography="t6" color={adaptive.grey500}>내 역할</Text>}
            right={
              <Text typography="t6" color={adaptive.grey900}>
                {isUserA ? '워크스페이스 생성자' : '초대로 참여'}
              </Text>
            }
          />
          {matchedDate && (
            <>
              <Spacing size={12} />
              <TableRow
                align="space-between"
                left={<Text typography="t6" color={adaptive.grey500}>매칭일</Text>}
                right={<Text typography="t6" color={adaptive.grey900}>{matchedDate}</Text>}
              />
            </>
          )}
          <Spacing size={12} />
          <TableRow
            align="space-between"
            left={<Text typography="t6" color={adaptive.grey500}>파트너</Text>}
            right={
              <Text typography="t6" fontWeight="bold" color={partner ? adaptive.grey900 : adaptive.grey400}>
                {partner?.nickname ?? '연결 대기 중'}
              </Text>
            }
          />
        </div>
      </div>

      <Spacing size={8} />

      {/* 반복 일정 */}
      <ListHeader
        title={
          <ListHeader.TitleParagraph typography="t5" color={adaptive.grey900} fontWeight="bold">
            {`반복 일정 ${templates.length}`}
          </ListHeader.TitleParagraph>
        }
      />
      {templates.length === 0 ? (
        <div style={{ padding: '24px 20px', textAlign: 'center' }}>
          <Text typography="t6" color={adaptive.grey400}>등록된 반복 일정이 없어요</Text>
        </div>
      ) : (
        <List>
          {templates.map(t => {
            const assigneeName = t.assignee_id === user.id ? '나' : (partner?.nickname ?? '파트너');
            return (
              <ListRow
                key={t.id}
                onClick={() => handleDeleteTemplate(t)}
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={t.title}
                    topProps={{ color: t.is_active ? adaptive.grey900 : adaptive.grey400, fontWeight: 'bold' }}
                    bottom={`${formatRecurrence(t)} · ${assigneeName}`}
                    bottomProps={{ color: adaptive.grey500 }}
                  />
                }
                right={
                  <Badge
                    size="small"
                    variant="fill"
                    color={t.is_active ? 'blue' : 'elephant'}
                  >
                    {t.is_active ? '활성' : '비활성'}
                  </Badge>
                }
              />
            );
          })}
        </List>
      )}

      <Spacing size={8} />

      {/* 설정 */}
      <ListHeader
        title={
          <ListHeader.TitleParagraph typography="t5" color={adaptive.grey900} fontWeight="bold">
            설정
          </ListHeader.TitleParagraph>
        }
      />
      <List>
        <ListRow
          onClick={handleReset}
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="데이터 초기화"
              topProps={{ color: adaptive.red500, fontWeight: 'bold' }}
              bottom="로컬 데이터를 초기화하고 새 사용자로 시작"
              bottomProps={{ color: adaptive.grey400 }}
            />
          }
          arrowType="right"
        />
      </List>

      <Spacing size={40} />

      <BottomTab />
    </div>
  );
}
