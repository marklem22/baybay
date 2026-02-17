import type { Meta, StoryObj } from "@storybook/react";
import { DashboardHeader } from "./DashboardHeader";

const meta: Meta<typeof DashboardHeader> = {
  component: DashboardHeader,
  title: "Dashboard/DashboardHeader",
};

export default meta;

type Story = StoryObj<typeof DashboardHeader>;

export const Default: Story = {
  args: {
    title: "Room Management System",
    subtitle: "Internal Operations Dashboard",
    statusLabel: "LIVE",
    dateTime: "Feb 16, 10:42:12",
  },
};
