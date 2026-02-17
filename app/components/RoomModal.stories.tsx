  import type { Meta, StoryObj } from "@storybook/react";
  import { RoomModal } from "./RoomModal";
  import { sampleHuts } from "../lib/sampleData";

  const meta: Meta<typeof RoomModal> = {
    component: RoomModal,
    title: "Dashboard/RoomModal",
    parameters: { layout: "fullscreen" },
  };

  export default meta;

  type Story = StoryObj<typeof RoomModal>;

  export const Default: Story = {
    args: {
      room: sampleHuts[0],
      isOpen: true,
      onClose: () => undefined,
      onUpdateSchedule: () => undefined,
    },
  };
