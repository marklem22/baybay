import type { Meta, StoryObj } from "@storybook/react";
import { StatsGrid } from "./StatsGrid";

const meta: Meta<typeof StatsGrid> = {
  component: StatsGrid,
  title: "Dashboard/StatsGrid",
};

export default meta;

type Story = StoryObj<typeof StatsGrid>;

export const Default: Story = {
  args: {
    items: [
      {
        label: "Total Rooms",
        value: 20,
        subtitle: "Across 20 rooms",
        icon: "BLD",
      },
      {
        label: "Available",
        value: 32,
        subtitle: "Ready for guests",
        icon: "OK",
        accentColor: "var(--success)",
      },
      {
        label: "Occupied",
        value: 15,
        subtitle: "Currently in use",
        icon: "IN",
        accentColor: "var(--danger)",
      },
      {
        label: "Maintenance",
        value: 3,
        subtitle: "Under service",
        icon: "SV",
        accentColor: "var(--warning)",
      },
      {
        label: "Cleaning",
        value: 4,
        subtitle: "Preparing for guests",
        icon: "CL",
        accentColor: "var(--accent-cyan)",
      },
    ],
  },
};
