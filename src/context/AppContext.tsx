import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { User, Chore, Reward } from '../types';
import { getChoresByCouple } from '../data/chores';
import { getRewardsByUser } from '../data/rewards';
import { getPartner } from '../data/couples';
import { supabase } from '../data/supabase';

// ─── State ────────────────────────────────────────────────────────────────────

interface AppState {
  user: User | null;
  partner: User | null;
  chores: Chore[];
  rewards: {
    received: Reward[];
    sent: Reward[];
  };
  loading: boolean;
}

const initialState: AppState = {
  user: null,
  partner: null,
  chores: [],
  rewards: { received: [], sent: [] },
  loading: false,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_PARTNER'; payload: User | null }
  | { type: 'SET_CHORES'; payload: Chore[] }
  | { type: 'SET_REWARDS'; payload: { received: Reward[]; sent: Reward[] } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UPDATE_CHORE'; payload: Chore }
  | { type: 'ADD_CHORE'; payload: Chore }
  | { type: 'REMOVE_CHORE'; payload: string }
  | { type: 'ADD_REWARD'; payload: Reward }
  | { type: 'UPDATE_REWARD'; payload: Reward };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_PARTNER':
      return { ...state, partner: action.payload };
    case 'SET_CHORES':
      return { ...state, chores: action.payload };
    case 'SET_REWARDS':
      return { ...state, rewards: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'UPDATE_CHORE':
      return {
        ...state,
        chores: state.chores.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };
    case 'ADD_CHORE':
      return { ...state, chores: [action.payload, ...state.chores] };
    case 'REMOVE_CHORE':
      return {
        ...state,
        chores: state.chores.filter((c) => c.id !== action.payload),
      };
    case 'ADD_REWARD':
      return {
        ...state,
        rewards: {
          ...state.rewards,
          received: [action.payload, ...state.rewards.received],
        },
      };
    case 'UPDATE_REWARD':
      return {
        ...state,
        rewards: {
          received: state.rewards.received.map((r) =>
            r.id === action.payload.id ? action.payload : r
          ),
          sent: state.rewards.sent.map((r) =>
            r.id === action.payload.id ? action.payload : r
          ),
        },
      };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue extends AppState {
  dispatch: React.Dispatch<Action>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface AppProviderProps {
  children: ReactNode;
  user: User;
}

export function AppProvider({ children, user }: AppProviderProps) {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    user,
  });

  const refreshData = useCallback(async () => {
    const currentUser = user;
    if (!currentUser?.couple_id) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const getSentRewards = async (): Promise<Reward[]> => {
        const { data, error } = await supabase
          .from('rewards')
          .select('*')
          .eq('giver_id', currentUser.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data ?? []) as Reward[];
      };

      const [chores, received, sent, partner] = await Promise.all([
        getChoresByCouple(currentUser.couple_id),
        getRewardsByUser(currentUser.id),
        getSentRewards(),
        getPartner(currentUser.id, currentUser.couple_id),
      ]);

      dispatch({ type: 'SET_CHORES', payload: chores });
      dispatch({ type: 'SET_REWARDS', payload: { received, sent } });
      dispatch({ type: 'SET_PARTNER', payload: partner });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <AppContext.Provider value={{ ...state, dispatch, refreshData }}>
      {children}
    </AppContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}
