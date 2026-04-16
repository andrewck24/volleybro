"use client";

export type TabContainerProps = {
  home: React.ReactNode;
  notifications: React.ReactNode;
  user: React.ReactNode;
  team: React.ReactNode;
};

export const TabContainer = ({ home, notifications, user, team }: TabContainerProps) => {
  return (
    <div>
      {home}
      {notifications}
      {user}
      {team}
    </div>
  );
};
