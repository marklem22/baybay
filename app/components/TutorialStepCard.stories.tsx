import type { Meta, StoryObj } from "@storybook/react";
import { TutorialStepCard } from "./TutorialStepCard";

const meta: Meta<typeof TutorialStepCard> = {
  component: TutorialStepCard,
  title: "Dashboard/TutorialStepCard",
};

export default meta;

type Story = StoryObj<typeof TutorialStepCard>;

export const Default: Story = {
  args: {
    step: 1,
    title: "Check room status",
    description: "This helps you quickly see which rooms are free right now.",
    steps: [
      "Open the Rooms page.",
      "Look at the room map first.",
      "Click any room to see more details.",
    ],
    tip: "If you are not sure what to do next, start with the map.",
  },
};

