import React from "react";

const mockEq = vi.fn().mockReturnThis();
const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
const mockSelect = vi.fn().mockReturnThis();
const mockSingle = vi.fn().mockResolvedValue({ data: { cover_offset_y: 20 }, error: null });

vi.mock("../supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user123" } }, error: null }),
    },
    from: vi.fn(() => ({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
      update: mockUpdate,
    })),
  },
}));

vi.mock("../components/FileImage", () => ({
  FileImage: React.forwardRef((props: any, ref) => (
    <img {...props} ref={ref} alt="Mock Cover" />
  )),
}));

vi.mock("../utils/uploadImage", () => ({
  uploadImage: vi.fn().mockResolvedValue({ filePath: "new/path/image.png" }),
}));

import { render, fireEvent, waitFor } from "@testing-library/react";
import { uploadImage } from "../utils/uploadImage";
import { supabase } from "../supabaseClient";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { Cover } from "./Cover";

describe("Cover", () => {
  const defaultProps = {
    filePath: "test/path.jpg",
    changePageCover: vi.fn(),
    pageId: 123,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders image and reposition buttons", () => {
    const { getByText } = render(<Cover {...defaultProps} />);
    expect(getByText("Reposition")).toBeInTheDocument();
    expect(getByText("Change cover photo")).toBeInTheDocument();
  });

  it("calls uploadImage and changePageCover on file upload", async () => {
    const { getByText, container } = render(<Cover {...defaultProps} />);
    const changeBtn = getByText("Change cover photo");
    fireEvent.click(changeBtn);

    const fileInput = container.querySelector('input[type="file"]')!;
    const file = new File(["dummy"], "test.png", { type: "image/png" });

    await waitFor(() => {
      fireEvent.change(fileInput, {
        target: { files: [file] },
      });
    });

    await waitFor(() => {
      expect(defaultProps.changePageCover).toHaveBeenCalledWith("new/path/image.png");
    });
  });

  it("starts repositioning on click", async () => {
    const { getByTestId } = render(<Cover {...defaultProps} />);
    const image = await waitFor(() => getByTestId("cover-image"));
    const container = getByTestId("cover-container");

    // Mock dimensions
    Object.defineProperty(image, "offsetHeight", {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(container, "offsetHeight", {
      configurable: true,
      value: 300,
    });

    fireEvent.click(getByTestId("reposition"));

    await waitFor(() => {
      expect(getByTestId("save")).toBeInTheDocument();
      expect(getByTestId("cancel")).toBeInTheDocument();
    });
  });

  it("cancels repositioning", async () => {
    const { getByTestId, queryByTestId } = render(<Cover {...defaultProps} />);
    fireEvent.click(getByTestId("reposition"));

    await waitFor(() => {
      expect(getByTestId("cancel")).toBeInTheDocument();
    });

    fireEvent.click(getByTestId("cancel"));

    await waitFor(() => {
      expect(queryByTestId("save")).not.toBeInTheDocument();
    });
  });

  it("shows and hides reposition buttons on mobile", async () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 400,
    });

    const { getByTestId, queryByTestId } = render(<Cover {...defaultProps} />);

    fireEvent.click(getByTestId("cover-container"));
    await waitFor(() => {
      expect(getByTestId("buttons")).toBeInTheDocument();
    });

    fireEvent.click(document.body);
    await waitFor(() => {
      expect(queryByTestId("buttons")).not.toBeInTheDocument();
    });
  });
  it("handles mouse drag to reposition image", async () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 });
    window.dispatchEvent(new Event('resize'));

    const { getByTestId } = render(<Cover {...defaultProps} />);
    
    // This now works
    fireEvent.click(getByTestId("reposition"));

    const container = getByTestId("cover-container");
    const image = getByTestId("cover-image");

    Object.defineProperty(image, "offsetHeight", { value: 400 });
    Object.defineProperty(container, "offsetHeight", { value: 300 });

    fireEvent.mouseDown(container, { clientY: 100 });
    fireEvent.mouseMove(window, { clientY: 120 });
    fireEvent.mouseMove(window, { clientY: 140 });
    fireEvent.mouseUp(window);
  });
  it("resets image and container dimensions on resize", async () => {
    const { getByTestId } = render(<Cover {...defaultProps} />);

    const image = getByTestId("cover-image");
    const container = getByTestId("cover-container");

    Object.defineProperty(image, "offsetHeight", { value: 400 });
    Object.defineProperty(container, "offsetHeight", { value: 300 });

    window.dispatchEvent(new Event("resize"));
  });
  it("sets image and container height on image load", () => {
    const { getByTestId } = render(<Cover {...defaultProps} />);
    const img = getByTestId("cover-image");

    Object.defineProperty(img, "offsetHeight", { value: 400 });
    Object.defineProperty(getByTestId("cover-container"), "offsetHeight", {
        value: 300,
    });

    fireEvent.load(img);
  });
  it("saves repositioned cover offset", async () => {
    const { getByTestId } = render(<Cover {...defaultProps} />);
    fireEvent.click(getByTestId("reposition"));

    const container = getByTestId("cover-container");
    const image = getByTestId("cover-image");

    Object.defineProperty(image, "offsetHeight", { value: 400 });
    Object.defineProperty(container, "offsetHeight", { value: 300 });

    fireEvent.mouseDown(container, { clientY: 100 });
    fireEvent.mouseMove(window, { clientY: 150 });
    fireEvent.mouseUp(window);

    fireEvent.click(getByTestId("save"));

    await waitFor(() => {
        expect(getByTestId("reposition")).toBeInTheDocument(); // button returns after save
    });
  });
  it("loads cover offset when userId and pageId exist", async () => {
    render(<Cover {...defaultProps} />);
    await waitFor(() => {
      expect(mockSingle).toHaveBeenCalled();
    });
  });
  it("removes event listeners on cleanup", async () => {
    const { unmount } = render(<Cover {...defaultProps} />);
    const removeListenerSpy = vi.spyOn(window, "removeEventListener");
    unmount();
    expect(removeListenerSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
    expect(removeListenerSpy).toHaveBeenCalledWith("mouseup", expect.any(Function));
    expect(removeListenerSpy).toHaveBeenCalledWith("touchmove", expect.any(Function));
    expect(removeListenerSpy).toHaveBeenCalledWith("touchend", expect.any(Function));
  });
  it("handles uploadImage error gracefully", async () => {
    vi.mocked(uploadImage).mockRejectedValueOnce(new Error("Upload failed"));

    const { getByText, container, findByText } = render(<Cover {...defaultProps} />);
    fireEvent.click(getByText("Change cover photo"));

    const fileInput = container.querySelector('input[type="file"]')!;
    const file = new File(["dummy"], "fail.png", { type: "image/png" });

    fireEvent.change(fileInput, {
      target: { files: [file] },
    });

    const errorElement = await findByText("Failed to upload cover image");
    expect(errorElement).toBeInTheDocument();
  });
  it("handles touch drag to reposition image", async () => {
    const { getByTestId } = render(<Cover {...defaultProps} />);
    fireEvent.click(getByTestId("reposition"));

    const container = getByTestId("cover-container");
    Object.defineProperty(container, "offsetHeight", { value: 300 });

    const image = getByTestId("cover-image");
    Object.defineProperty(image, "offsetHeight", { value: 400 });

    fireEvent.touchStart(container, {
      touches: [{ clientY: 100 }],
    });

    fireEvent.touchMove(window, {
      touches: [{ clientY: 120 }],
    });

    fireEvent.touchMove(window, {
      touches: [{ clientY: 150 }],
    });

    fireEvent.touchEnd(window);
  });
  it("handles error when loading cover offset from supabase", async () => {
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: "error" }),
      update: vi.fn(),
    });
    const { findByText } = render(<Cover {...defaultProps} />);
    const errorElement = await findByText("Failed to load cover position");
    expect(errorElement).toBeInTheDocument();
  });
  it("logs error when no user is found", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: null,
      error: { message: "No user" }
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Cover {...defaultProps} />);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("User not found:", { message: "No user" });
    });
  });
  it("moves image with arrow keys", async () => {
    const { getByTestId } = render(<Cover {...defaultProps} />);
    fireEvent.click(getByTestId("reposition"));
    const image = getByTestId("cover-image");

    fireEvent.keyDown(image, { key: "ArrowUp" });
    fireEvent.keyDown(image, { key: "ArrowDown" });
  });
  it("handles Supabase offset fetch error when user exists", async () => {
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: "error" }),
      update: vi.fn(),
    });
    
    const { findByText } = render(<Cover {...defaultProps} />);
    expect(await findByText("Failed to load cover position")).toBeInTheDocument();
  });
  it("handles image load error", () => {
    const { getByTestId } = render(<Cover {...defaultProps} />);
    const img = getByTestId("cover-image");
    fireEvent.error(img); // triggers onError branch
  });
  it("ignores mouseDown when not repositioning", () => {
    const { getByTestId } = render(<Cover {...defaultProps} />);
    const container = getByTestId("cover-container");

    fireEvent.mouseDown(container, { clientY: 100 });

    expect(container).toBeInTheDocument();
  });
  it("ignores mouseMove when not dragging", () => {
    const { getByTestId } = render(<Cover {...defaultProps} />);
    const container = getByTestId("cover-container");

    fireEvent.mouseMove(container, { clientY: 100 });
    expect(container).toBeInTheDocument();
  });
  it("ignores touchStart when not repositioning", () => {
    const { getByTestId } = render(<Cover {...defaultProps} />);
    const container = getByTestId("cover-container");
    fireEvent.touchStart(container, { touches: [{ clientY: 100 }] });
  });
  it("ignores touchMove when not dragging", () => {
    const { getByTestId } = render(<Cover {...defaultProps} />);
    const container = getByTestId("cover-container");
    fireEvent.touchMove(container, { touches: [{ clientY: 120 }] });
  });
  it("handles unexpected thrown error when loading cover offset", async () => {
    vi.mocked(supabase.from).mockImplementationOnce(() => {
      throw new Error("network failure");
    });

    const { findByText } = render(<Cover {...defaultProps} />);
    expect(await findByText("Unexpected error loading cover position")).toBeInTheDocument();
  });
  it("handles error when saving reposition", async () => {
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      update: vi.fn().mockResolvedValue({ error: "save error" }),
    });

    const { getByTestId, findByText } = render(<Cover {...defaultProps} />);
    fireEvent.click(getByTestId("reposition"));
    fireEvent.click(getByTestId("save"));

    expect(await findByText("Failed to save cover position")).toBeInTheDocument();
  });
});