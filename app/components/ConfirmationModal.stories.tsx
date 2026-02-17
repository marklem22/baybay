import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { ConfirmationModal } from "./ConfirmationModal";

const meta: Meta<typeof ConfirmationModal> = {
  component: ConfirmationModal,
  title: "Dashboard/ConfirmationModal",
  parameters: { layout: "centered" },
};

export default meta;

type Story = StoryObj<typeof ConfirmationModal>;

export const Danger: Story = {
  render: (args) => {
    const [open, setOpen] = useState(true);
    return (
      <div className="min-h-[240px] min-w-[320px]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm"
        >
          Open Modal
        </button>
        <ConfirmationModal
          {...args}
          isOpen={open}
          onClose={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
        />
      </div>
    );
  },
  args: {
    title: "Delete selected entries?",
    description: "This action cannot be undone and will permanently remove the selected logs.",
    confirmLabel: "Delete Selected",
    cancelLabel: "Cancel",
    tone: "danger",
    isLoading: false,
  },
};

export const Primary: Story = {
  args: {
    isOpen: true,
    title: "Apply changes?",
    description: "This will update the selected records.",
    confirmLabel: "Apply",
    cancelLabel: "Cancel",
    tone: "primary",
    isLoading: false,
    onClose: () => undefined,
    onConfirm: () => undefined,
  },
};
