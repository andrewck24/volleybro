import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayerCard } from '@/components/team/player-card';
import { PlayerRole } from '@/entities/player';

describe('PlayerCard', () => {
  const mockOnEdit = jest.fn();
  const mockOnRemove = jest.fn();
  const mockOnPromote = jest.fn();

  const joinedPlayer = {
    _id: 'player-1',
    name: 'John Doe',
    number: 1,
    position: 'OH',
    teamId: 'team-1',
    role: PlayerRole.MEMBER,
    userId: 'user-1',
  };

  const invitedPlayer = {
    _id: 'player-2',
    name: 'Jane Smith',
    number: 2,
    position: 'MB',
    teamId: 'team-1',
    role: PlayerRole.ADMIN,
    email: 'jane@example.com',
  };

  const purePlayer = {
    _id: 'player-3',
    name: 'Bob Johnson',
    number: 0,
    position: '',
    teamId: 'team-1',
    role: PlayerRole.MEMBER,
  };

  beforeEach(() => {
    mockOnEdit.mockClear();
    mockOnRemove.mockClear();
    mockOnPromote.mockClear();
  });

  /**
   * T056 [US3] PlayerCard 元件測試
   * 驗證球員卡片的顯示與互動功能
   */
  describe('基本渲染', () => {
    it('should display player information correctly', () => {
      render(<PlayerCard player={joinedPlayer} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText(/主攻手/)).toBeInTheDocument();
      expect(screen.getByText(/球號: 1/)).toBeInTheDocument();
    });

    it('should display correct status badges', () => {
      render(<PlayerCard player={joinedPlayer} />);

      expect(screen.getByText('已加入')).toBeInTheDocument();
      expect(screen.getByText('成員')).toBeInTheDocument();
    });

    it('should display user ID for joined players', () => {
      render(<PlayerCard player={joinedPlayer} />);

      expect(screen.getByText('user-1')).toBeInTheDocument();
    });

    it('should display email for invited players', () => {
      render(<PlayerCard player={invitedPlayer} />);

      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });

    it('should display correct position label for pure players', () => {
      render(<PlayerCard player={purePlayer} />);

      expect(screen.getByText('未指定')).toBeInTheDocument();
      expect(screen.queryByText(/球號/)).not.toBeInTheDocument();
    });

    it('should display admin role badge correctly', () => {
      render(<PlayerCard player={invitedPlayer} />);

      expect(screen.getByText('管理員')).toBeInTheDocument();
    });
  });

  describe('管理功能', () => {
    it('should show edit button when canManage is true', () => {
      render(
        <PlayerCard player={joinedPlayer} canManage={true} onEdit={mockOnEdit} />
      );

      expect(screen.getByRole('button', { name: '編輯' })).toBeInTheDocument();
    });

    it('should not show edit button when canManage is false', () => {
      render(
        <PlayerCard player={joinedPlayer} canManage={false} onEdit={mockOnEdit} />
      );

      expect(screen.queryByRole('button', { name: '編輯' })).not.toBeInTheDocument();
    });

    it('should call onEdit when edit button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <PlayerCard player={joinedPlayer} canManage={true} onEdit={mockOnEdit} />
      );

      const editButton = screen.getByRole('button', { name: '編輯' });
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(joinedPlayer);
    });

    it('should show promote button for MEMBER role', () => {
      render(
        <PlayerCard
          player={joinedPlayer}
          canManage={true}
          onPromote={mockOnPromote}
        />
      );

      expect(
        screen.getByRole('button', { name: '升級為管理員' })
      ).toBeInTheDocument();
    });

    it('should not show promote button for ADMIN role', () => {
      render(
        <PlayerCard
          player={invitedPlayer}
          canManage={true}
          onPromote={mockOnPromote}
        />
      );

      expect(
        screen.queryByRole('button', { name: '升級為管理員' })
      ).not.toBeInTheDocument();
    });

    it('should show remove button when canManage is true and not owner', () => {
      render(
        <PlayerCard
          player={joinedPlayer}
          canManage={true}
          isOwner={false}
          onRemove={mockOnRemove}
        />
      );

      expect(screen.getByRole('button', { name: '移除' })).toBeInTheDocument();
    });

    it('should not show remove button for owner', () => {
      render(
        <PlayerCard
          player={joinedPlayer}
          canManage={true}
          isOwner={true}
          onRemove={mockOnRemove}
        />
      );

      expect(
        screen.queryByRole('button', { name: '移除' })
      ).not.toBeInTheDocument();
    });

    it('should call onRemove when remove button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <PlayerCard
          player={joinedPlayer}
          canManage={true}
          isOwner={false}
          onRemove={mockOnRemove}
        />
      );

      const removeButton = screen.getByRole('button', { name: '移除' });
      await user.click(removeButton);

      expect(mockOnRemove).toHaveBeenCalledWith('player-1');
    });
  });

  describe('加載狀態', () => {
    it('should disable all buttons when isLoading is true', () => {
      render(
        <PlayerCard
          player={joinedPlayer}
          canManage={true}
          isLoading={true}
          onEdit={mockOnEdit}
          onRemove={mockOnRemove}
          onPromote={mockOnPromote}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });
});
