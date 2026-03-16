import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { APP_META } from "../../appMeta";
import { Header } from "./Header";

describe("Header", () => {
  it("shows version and opens What's New modal", async () => {
    const user = userEvent.setup();
    render(<Header appMeta={APP_META} activeTab="viewer" onTabChange={() => undefined} />);

    expect(screen.getByLabelText(`Version ${APP_META.version}`)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "What's New" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText(`v${APP_META.version}`)).toBeInTheDocument();
  });
});
