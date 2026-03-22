import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvitationList } from '@/components/team/invitation-list';
import { PlayerRole, PlayerStatus } from '@/entities/player';
import { createPlayer } from '@/__tests__/helpers';

describe('InvitationList', () => {
  const mockOnAccept = jest.fn();
  const mockOnReject = jest.fn();

  const pendingInvitation = createPlayer({
    name: '團隊 A',
    number: 0,
    position: undefined,
    status: PlayerStatus.INVITED,
    email: 'user@example.com',
    userId: undefined,
  });

  const acceptedInvitation = createPlayer({
    _id: 'player-2',
    name: '團隊 B',
    number: 0,
    position: undefined,
    status: PlayerStatus.JOINED,
    teamId: 'team-2',
    email: undefined,
    userId: 'user-123',
  });

  beforeEach(() => {
    mockOnAccept.mockClear();
    mockOnReject.mockClear();
  });

  /**
   * T042 [US2] InvitationList 元件測試
   * 驗證邀請列表的顯示與互動功能
   */
  describe('無邀請時的顯示', () => {
    it('should display empty state when no pending invitations', () => {
      render(
        <InvitationList
          invitations={[acceptedInvitation]}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('您目前沒有任何待決的邀請')).toBeInTheDocument();
    });
  });

  describe('邀請列表渲染', () => {
    it('should display pending invitations', () => {
      render(
        <InvitationList
          invitations={[pendingInvitation]}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('待決邀請')).toBeInTheDocument();
      expect(
        screen.getByText(/您有 1 個待決的邀請/)
      ).toBeInTheDocument();
      // Check for the broken up text elements
      expect(screen.getByText(/您被邀請以/)).toBeInTheDocument();
      expect(screen.getByText(/身份加入隊伍/)).toBeInTheDocument();
      expect(screen.getByText('成員')).toBeInTheDocument();
    });

    it('should display correct count of pending invitations', () => {
      const multipleInvitations = [
        pendingInvitation,
        {
          ...pendingInvitation,
          _id: 'player-3',
          role: PlayerRole.ADMIN,
        },
      ];

      render(
        <InvitationList
          invitations={multipleInvitations}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      expect(
        screen.getByText(/您有 2 個待決的邀請/)
      ).toBeInTheDocument();
    });

    it('should filter out accepted invitations', () => {
      const invitations = [pendingInvitation, acceptedInvitation];

      render(
        <InvitationList
          invitations={invitations}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      expect(
        screen.getByText(/您有 1 個待決的邀請/)
      ).toBeInTheDocument();
    });

    it('should display role badge with correct label', () => {
      const adminInvitation = {
        ...pendingInvitation,
        role: PlayerRole.ADMIN,
      };

      render(
        <InvitationList
          invitations={[adminInvitation]}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('管理員')).toBeInTheDocument();
    });

    it('should display email when available', () => {
      render(
        <InvitationList
          invitations={[pendingInvitation]}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      expect(
        screen.getByText('邀請電子郵件：user@example.com')
      ).toBeInTheDocument();
    });
  });

  describe('邀請操作', () => {
    it('should call onAccept when accept button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <InvitationList
          invitations={[pendingInvitation]}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      const acceptButton = screen.getByRole('button', { name: '接受' });
      await user.click(acceptButton);

      await waitFor(() => {
        expect(mockOnAccept).toHaveBeenCalledWith('player-1');
      });
    });

    it('should call onReject when reject button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <InvitationList
          invitations={[pendingInvitation]}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      const rejectButton = screen.getByRole('button', { name: '拒絕' });
      await user.click(rejectButton);

      await waitFor(() => {
        expect(mockOnReject).toHaveBeenCalledWith('player-1');
      });
    });

    it('should handle multiple invitations independently', async () => {
      const user = userEvent.setup();
      const invitations = [
        pendingInvitation,
        {
          ...pendingInvitation,
          _id: 'player-3',
          role: PlayerRole.ADMIN,
        },
      ];

      render(
        <InvitationList
          invitations={invitations}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      const acceptButtons = screen.getAllByRole('button', { name: '接受' });
      await user.click(acceptButtons[0]);

      await waitFor(() => {
        expect(mockOnAccept).toHaveBeenCalledWith('player-1');
      });

      mockOnAccept.mockClear();

      const rejectButtons = screen.getAllByRole('button', { name: '拒絕' });
      await user.click(rejectButtons[1]);

      await waitFor(() => {
        expect(mockOnReject).toHaveBeenCalledWith('player-3');
      });
    });
  });

  describe('加載狀態', () => {
    it('should disable buttons when isLoading is true', () => {
      render(
        <InvitationList
          invitations={[pendingInvitation]}
          isLoading={true}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      const acceptButton = screen.getByRole('button', { name: '接受' });
      const rejectButton = screen.getByRole('button', { name: '拒絕' });

      expect(acceptButton).toBeDisabled();
      expect(rejectButton).toBeDisabled();
    });

    it('should disable buttons when isSubmitting is true', () => {
      render(
        <InvitationList
          invitations={[pendingInvitation]}
          isSubmitting={true}
          onAccept={mockOnAccept}
          onReject={mockOnReject}
        />
      );

      const acceptButton = screen.getByRole('button', { name: '接受' });
      const rejectButton = screen.getByRole('button', { name: '拒絕' });

      expect(acceptButton).toBeDisabled();
      expect(rejectButton).toBeDisabled();
    });
  });
});
