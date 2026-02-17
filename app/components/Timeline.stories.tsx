import type { Meta, StoryObj } from "@storybook/react";
import { Timeline } from "./Timeline";
import { sampleHuts, sampleTimeline } from "../lib/sampleData";

const meta: Meta<typeof Timeline> = {
  component: Timeline,
  title: "Dashboard/Timeline",
};

export default meta;

type Story = StoryObj<typeof Timeline>;

export const Default: Story = {
  args: {
    rooms: sampleHuts.slice(0, 6),
    days: 14,
    timeline: sampleTimeline,
  },
};
