"use client";

import { UserButton } from "@clerk/nextjs";

export function UserMenu() {
  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Link
          label="Settings"
          labelIcon={<span style={{ fontSize: "0.85rem" }}>⚙️</span>}
          href="/dashboard/settings"
        />
      </UserButton.MenuItems>
    </UserButton>
  );
}
