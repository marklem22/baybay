import type { Meta, StoryObj } from "@storybook/react";
import { TutorialSectionAccordion } from "./TutorialSectionAccordion";

const meta: Meta<typeof TutorialSectionAccordion> = {
  component: TutorialSectionAccordion,
  title: "Dashboard/TutorialSectionAccordion",
};

export default meta;

type Story = StoryObj<typeof TutorialSectionAccordion>;

export const Default: Story = {
  args: {
    title: "Room Monitoring",
    subtitle: "Use these steps to check room availability and update schedule status by date.",
    defaultOpen: true,
    children: (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-secondary)]">
        Section content goes here.
      </div>
    ),
  },
};

