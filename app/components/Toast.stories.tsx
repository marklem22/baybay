import type { Meta, StoryObj } from "@storybook/react";
import { Toast } from "./Toast";

const meta: Meta<typeof Toast> = {
  component: Toast,
  title: "Dashboard/Toast",
  parameters: { layout: "fullscreen" },
};

export default meta;

type Story = StoryObj<typeof Toast>;

export const Default: Story = {
  args: {
    message: "Room 203 updated to AVAILABLE",
    onClose: () => undefined,
  },
};
