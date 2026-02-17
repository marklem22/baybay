import type { Meta, StoryObj } from "@storybook/react";
import { FloorMap } from "./FloorMap";
import { sampleHuts } from "../lib/sampleData";

const meta: Meta<typeof FloorMap> = {
  component: FloorMap,
  title: "Dashboard/FloorMap",
};

export default meta;

type Story = StoryObj<typeof FloorMap>;

export const Default: Story = {
  args: {
    huts: sampleHuts,
    onRoomClick: () => undefined,
  },
};
