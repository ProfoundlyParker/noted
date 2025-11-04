import { render, fireEvent } from "@testing-library/react";
import { ErrorMessage } from "./ErrorMessage";

describe("ErrorMessage", () => {
  it("renders the error message text", () => {
    const { getByText } = render(<ErrorMessage message="Something went wrong" />);
    expect(getByText("Something went wrong")).toBeTruthy();
  });

  it("renders a close button only when onClose is provided", () => {
    const { queryByRole, rerender } = render(<ErrorMessage message="Error" />);
    expect(queryByRole("button")).toBeNull();

    const handleClose = vi.fn();
    rerender(<ErrorMessage message="Error" onClose={handleClose} />);
    expect(queryByRole("button")).toBeTruthy();
  });

  it("calls onClose when close button is clicked", () => {
    const handleClose = vi.fn();
    const { getByRole } = render(<ErrorMessage message="Error" onClose={handleClose} />);
    fireEvent.click(getByRole("button"));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});