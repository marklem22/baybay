import type { Meta, StoryObj } from "@storybook/react";
import { FiltersSection } from "./FiltersSection";

const meta: Meta<typeof FiltersSection> = {
  component: FiltersSection,
  title: "Dashboard/FiltersSection",
};

export default meta;

type Story = StoryObj<typeof FiltersSection>;

export const Default: Story = {
  args: {
    startDate: "2026-02-16",
    endDate: "2026-02-23",
    roomType: "all",
    roomTypeOptions: [
      { key: "single", label: "Single" },
      { key: "double", label: "Double" },
      { key: "suite", label: "Suite" },
      { key: "deluxe", label: "Deluxe" },
    ],
    status: "all",
    onChange: () => undefined,
    onApply: () => undefined,
    onReset: () => undefined,
  },
};
