import { useNavigate, useLocation } from 'react-router-dom';
import { Text, Asset } from '@toss/tds-mobile';
import { adaptive } from '@toss/tds-colors';

interface TabItem {
  path: string;
  label: string;
  icon: string;
}

const TABS: TabItem[] = [
  { path: '/home', label: '홈', icon: 'icon-home-mono' },
  { path: '/rewards', label: '보상', icon: 'icon-diamond-mono' },
  { path: '/my', label: '마이', icon: 'icon-user-mono' },
];

export default function BottomTab() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div style={{
      position: 'fixed', bottom: 12, left: 16, right: 16,
      display: 'flex', backgroundColor: '#fff',
      borderRadius: 999,
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
      padding: '10px 0',
    }}>
      {TABS.map(tab => {
        const isActive = pathname === tab.path;
        return (
          <div
            key={tab.path}
            style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}
            onClick={() => navigate(tab.path)}
          >
            <Asset.Icon
              frameShape={Asset.frameShape.CleanW24}
              name={tab.icon}
              color={isActive ? adaptive.grey800 : adaptive.grey400}
              aria-hidden={true}
            />
            <Text
              display="block"
              color={isActive ? adaptive.grey900 : adaptive.grey600}
              typography="st13"
              fontWeight="medium"
              textAlign="center"
            >
              {tab.label}
            </Text>
          </div>
        );
      })}
    </div>
  );
}
