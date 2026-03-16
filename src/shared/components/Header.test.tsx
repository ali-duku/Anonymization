import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { APP_META } from "../../appMeta";
import { Header } from "./Header";

describe("Header", () => {
  it("shows version and opens What's New modal", async () => {
    const user = userEvent.setup();
    render(
      <Header
        appMeta={APP_META}
        activeTab="viewer"
        onTabChange={() => undefined}
        onManualSave={() => undefined}
        onUndo={() => undefined}
        onRedo={() => undefined}
        canManualSave={false}
        canUndo={false}
        canRedo={false}
      />
    );

    expect(screen.getByLabelText(`Version ${APP_META.version}`)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "What's New" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText(`v${APP_META.version}`)).toBeInTheDocument();
  });

  it("renders top-bar save/undo/redo controls and fires callbacks", async () => {
    const user = userEvent.setup();
    const onManualSave = vi.fn();
    const onUndo = vi.fn();
    const onRedo = vi.fn();

    render(
      <Header
        appMeta={APP_META}
        activeTab="viewer"
        onTabChange={() => undefined}
        onManualSave={onManualSave}
        onUndo={onUndo}
        onRedo={onRedo}
        canManualSave
        canUndo
        canRedo
      />
    );

    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "Undo" }));
    await user.click(screen.getByRole("button", { name: "Redo" }));

    expect(onManualSave).toHaveBeenCalledTimes(1);
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
  });
});
