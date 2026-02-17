import type { Meta, StoryObj } from "@storybook/react";
import { TutorialChecklist } from "./TutorialChecklist";

const meta: Meta<typeof TutorialChecklist> = {
  component: TutorialChecklist,
  title: "Dashboard/TutorialChecklist",
};

export default meta;

type Story = StoryObj<typeof TutorialChecklist>;

export const Default: Story = {
  args: {
    title: "Quick Start",
    subtitle: "Use these 3 steps to get comfortable with the app.",
    items: [
      {
        title: "Open Rooms",
        description: "This is your main dashboard where you see all rooms.",
      },
      {
        title: "Use Filters",
        description: "Pick date and room type so you only see what you need.",
      },
      {
        title: "Check Logs",
        description: "Open Logs to review what changes were made and when.",
      },
    ],
  },
};

