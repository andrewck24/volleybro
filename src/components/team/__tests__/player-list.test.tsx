import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayerList } from '@/components/team/player-list';
import { PlayerRole } from '@/entities/player';

describe('PlayerList', () => {
  const mockOnEdit = jest.fn();
  const mockOnRemove = jest.fn();
  const mockOnPromote = jest.fn();

  const players = [
    {
      _id: 'player-1',
      name: 'John Doe',
      number: 1,
      position: 'OH',
      teamId: 'team-1',
      role: PlayerRole.MEMBER,
      userId: 'user-1',
    },
    {
      _id: 'player-2',
      name: 'Jane Smith',
      number: 2,
      position: 'MB',
      teamId: 'team-1',
      role: PlayerRole.ADMIN,
      email: 'jane@example.com',
    },
    {
      _id: 'player-3',
      name: 'Bob Johnson',
      number: 0,
      position: '',
      teamId: 'team-1',
      role: PlayerRole.MEMBER,
    },
  ];

  beforeEach(() => {
    mockOnEdit.mockClear();
    mockOnRemove.mockClear();
    mockOnPromote.mockClear();
  });

  /**
   * T057 [US3] PlayerList 元件測試（含篩選功能）
   * 驗證球員列表的顯示、搜尋與篩選功能
   */
  describe('基本渲染', () => {
    it('should display all players when no filters applied', () => {
      render(
        <PlayerList players={players} onEdit={mockOnEdit} onRemove={mockOnRemove} />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      expect(screen.getByText(/共 3 位球員/)).toBeInTheDocument();
    });

    it('should display empty state when no players', () => {
      render(<PlayerList players={[]} onEdit={mockOnEdit} onRemove={mockOnRemove} />);

      expect(screen.getByText('暫無球員記錄')).toBeInTheDocument();
    });

    it('should display player count summary correctly', () => {
      const { container } = render(<PlayerList players={players} />);

      // Check for summary text containing player count
      const summary = container.textContent;
      expect(summary).toContain('共 3 位球員');
      // Jane Smith is INVITED (has email but no userId), not JOINED
      expect(summary).toContain('已加入: 1');
      expect(summary).toContain('待決: 1');
      expect(summary).toContain('純球員: 1');
    });
  });

  describe('搜尋功能', () => {
    it('should filter players by name search', async () => {
      const user = userEvent.setup();

      render(
        <PlayerList players={players} onEdit={mockOnEdit} onRemove={mockOnRemove} />
      );

      const searchInput = screen.getByPlaceholderText('輸入球員名稱');
      await user.type(searchInput, 'Jane');

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
      });
    });

    it('should be case insensitive for name search', async () => {
      const user = userEvent.setup();

      render(
        <PlayerList players={players} onEdit={mockOnEdit} onRemove={mockOnRemove} />
      );

      const searchInput = screen.getByPlaceholderText('輸入球員名稱');
      await user.type(searchInput, 'john');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      });
    });

    it('should show no results for non-matching search', async () => {
      const user = userEvent.setup();

      render(
        <PlayerList players={players} onEdit={mockOnEdit} onRemove={mockOnRemove} />
      );

      const searchInput = screen.getByPlaceholderText('輸入球員名稱');
      await user.type(searchInput, 'NonExistent');

      await waitFor(() => {
        expect(screen.getByText('沒有符合篩選條件的球員')).toBeInTheDocument();
      });
    });
  });

  describe('位置篩選', () => {
    it('should filter players by position', async () => {
      const user = userEvent.setup();

      render(
        <PlayerList players={players} onEdit={mockOnEdit} onRemove={mockOnRemove} />
      );

      const positionSelect = screen.getByDisplayValue('所有位置');
      await user.selectOptions(positionSelect, 'OH');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
        expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
      });
    });

    it('should show position options correctly', async () => {
      const user = userEvent.setup();

      render(
        <PlayerList players={players} onEdit={mockOnEdit} onRemove={mockOnRemove} />
      );

      const positionSelect = screen.getByDisplayValue('所有位置');
      await user.click(positionSelect);

      expect(screen.getByRole('option', { name: '主攻手' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '中塊' })).toBeInTheDocument();
    });
  });

  describe('狀態篩選', () => {
    it('should filter players by status', async () => {
      const user = userEvent.setup();

      render(
        <PlayerList players={players} onEdit={mockOnEdit} onRemove={mockOnRemove} />
      );

      const statusSelect = screen.getByDisplayValue('所有狀態');
      await user.selectOptions(statusSelect, 'JOINED');

      await waitFor(() => {
        // Bob Johnson should not appear since PURE_PLAYER doesn't match JOINED filter
        expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
      });
    });
  });

  describe('清除篩選', () => {
    it('should clear all filters when clear button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <PlayerList players={players} onEdit={mockOnEdit} onRemove={mockOnRemove} />
      );

      const searchInput = screen.getByPlaceholderText('輸入球員名稱');
      await user.type(searchInput, 'Jane');

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      const clearButton = screen.getByRole('button', { name: '清除篩選' });
      await user.click(clearButton);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      });
    });

    it('should not show clear button when no filters applied', () => {
      render(
        <PlayerList players={players} onEdit={mockOnEdit} onRemove={mockOnRemove} />
      );

      expect(
        screen.queryByRole('button', { name: '清除篩選' })
      ).not.toBeInTheDocument();
    });
  });

  describe('多重篩選', () => {
    it('should apply multiple filters simultaneously', async () => {
      const user = userEvent.setup();
      const multiPlayers = [
        ...players,
        {
          _id: 'player-4',
          name: 'Alice',
          number: 3,
          position: 'OH',
          teamId: 'team-1',
          role: PlayerRole.MEMBER,
          userId: 'user-4',
        },
      ];

      render(
        <PlayerList
          players={multiPlayers}
          onEdit={mockOnEdit}
          onRemove={mockOnRemove}
        />
      );

      // Apply position filter
      const positionSelect = screen.getByDisplayValue('所有位置');
      await user.selectOptions(positionSelect, 'OH');

      // Apply search
      const searchInput = screen.getByPlaceholderText('輸入球員名稱');
      await user.type(searchInput, 'John');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Alice')).not.toBeInTheDocument();
      });
    });
  });

  describe('管理功能', () => {
    it('should pass correct props to PlayerCard components', () => {
      render(
        <PlayerList
          players={[players[0]]}
          canManage={true}
          isOwner={false}
          onEdit={mockOnEdit}
          onRemove={mockOnRemove}
          onPromote={mockOnPromote}
        />
      );

      expect(screen.getByRole('button', { name: '編輯' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '升級為管理員' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '移除' })).toBeInTheDocument();
    });
  });
});
