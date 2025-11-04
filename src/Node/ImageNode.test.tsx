import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { ImageNode } from "./ImageNode";
import { vi } from "vitest";
import { uploadImage } from "../utils/uploadImage";
import { supabase } from "../supabaseClient";

const mockRemoveNodeByIndex = vi.fn();
const mockChangeNodeValue = vi.fn();
const mockChangeNodeType = vi.fn();

vi.mock("../state/AppStateContext", () => ({
  useAppState: () => ({
    changeNodeValue: mockChangeNodeValue,
    removeNodeByIndex: mockRemoveNodeByIndex,
    changeNodeType: mockChangeNodeType,
  }),
}));

vi.mock("../Page/PageIdContext", () => ({
  usePageId: () => "test-page-id",
}));

vi.mock("../utils/uploadImage", () => ({
  uploadImage: vi.fn(),
}));

vi.mock("../supabaseClient", () => {
  const mockUpdate = vi.fn().mockReturnThis();
  const mockSelect = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockSingle = vi.fn().mockResolvedValue({
    data: {
      nodes: [
        {
          id: "node456",
          width: 300,
          height: 150,
          caption: "Original",
        },
        {
          id: "node789",
          width: 500,
          height: 500,
          caption: "Another node",
        },
      ],
    },
  });

  return {
    supabase: {
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "user123" } } , error: null })),
      },
      from: vi.fn(() => ({
        select: mockSelect,
        update: mockUpdate,
        eq: mockEq,
        single: mockSingle,
      })),
    },
  };
});

describe("<ImageNode />", () => {
  const defaultProps = {
    index: 0,
    node: {
      id: "node-id",
      type: "image",
      value: "image.png",
      width: 300,
      height: 200,
      caption: "Example caption",
    },
  };

  it("renders image and caption", async () => {
     render(<ImageNode {...defaultProps} />);

     expect(screen.getByTestId("image-caption")).toBeInTheDocument();

     await waitFor(() => {
        expect(screen.getByTestId("image-node")).toBeInTheDocument();
     });
   });
  it("calls uploadImage and updates value on file upload", async () => {
    const mockUpload = uploadImage as unknown as vi.Mock;
    mockUpload.mockResolvedValue({ filePath: "new-path.png" });

    render(<ImageNode {...defaultProps} />);
    const fileInput = screen.getByTestId("node-image-upload", { selector: "input" });

    fireEvent.change(fileInput, {
      target: { files: [new File(["img"], "test.png", { type: "image/png" })] },
    });

    await waitFor(() => {
      expect(uploadImage).toHaveBeenCalled();
    });
  });
  it("deletes node on delete click", () => {
    render(<ImageNode {...defaultProps} />);
    fireEvent.click(screen.getByText("Delete"));
    expect(mockRemoveNodeByIndex).toHaveBeenCalledWith(0);
  });
  it("triggers file input on replace click", () => {
    render(<ImageNode {...defaultProps} />);
    const replaceButton = screen.getByText("Replace");
    fireEvent.click(replaceButton);
  });
  it("enters and saves caption edit mode", async () => {
    const getUserMock = vi.spyOn(supabase.auth, "getUser")
      .mockResolvedValue({ data: { user: { id: "user123" } }, error: null });

    render(<ImageNode {...defaultProps} />);

    await waitFor(() => {
      expect(getUserMock).toHaveBeenCalled();
    });

    const caption = screen.getByText("Example caption");
    fireEvent.click(caption);

    const input = screen.getByDisplayValue("Example caption");
    fireEvent.change(input, { target: { value: "Updated caption" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalled();
      expect(supabase.from().update).toHaveBeenCalled();
    });

    getUserMock.mockRestore();
  });
  it("shows upload button if no image exists", () => {
    render(<ImageNode {...defaultProps} node={{ ...defaultProps.node, value: "" }} />);
    expect(screen.getByText("Upload Image")).toBeInTheDocument();
  });
  it("clears node value and image path if no file is uploaded", async () => {
    render(<ImageNode {...defaultProps} changeNodeValue={mockChangeNodeValue} />);
    const input = screen.getByTestId("node-image-upload") as HTMLInputElement;
    const emptyFileList = {
        length: 0,
        item: () => null,
    } as unknown as FileList;

    await fireEvent.change(input, { target: { files: emptyFileList } });
    expect(mockChangeNodeValue).toHaveBeenCalledWith(defaultProps.index, "");
  });
  it("calls removeNodeByIndex on Backspace if input is not focused", () => {
    render(<ImageNode {...defaultProps} />);
    fireEvent.keyDown(window, { key: "Backspace" });
    expect(mockRemoveNodeByIndex).toHaveBeenCalledWith(defaultProps.index);
  });
  it("blurs caption input on Enter", () => {
    render(<ImageNode {...defaultProps} />);
    const caption = screen.getByTestId("image-caption");
    fireEvent.keyDown(caption, { key: "Enter" });

    const input = screen.getByPlaceholderText("Add a caption...");
    const blur = vi.spyOn(input, "blur");

    fireEvent.keyDown(input, { key: "Enter" });
    expect(blur).toHaveBeenCalled();
  });
  it("starts editing caption on Enter or Space key", () => {
    render(<ImageNode {...defaultProps} />);
    const caption = screen.getByTestId("image-caption");
    fireEvent.keyDown(caption, { key: "Enter" });
    expect(screen.getByPlaceholderText("Add a caption...")).toBeInTheDocument();
  });
  it("updates Supabase when image is resized (simulate drag)", async () => {
    const getUserMock = vi.spyOn(supabase.auth, "getUser")
      .mockResolvedValue({ data: { user: { id: "user123" } }, error: null });

    render(
      <ImageNode
        index={0}
        node={{
          id: "node-id",
          type: "image",
          value: "fake-url",
          width: 300,
          height: 200,
          caption: "",
        }}
        changeNodeValue={mockChangeNodeValue}
        removeNodeByIndex={mockRemoveNodeByIndex}
        updateFocusedIndex={vi.fn()}
        focused={true}
      />
    );

    await waitFor(() => expect(getUserMock).toHaveBeenCalled());

    const resizeWrapper = screen.getByTestId("resize-wrapper");

    const handle = Array.from(resizeWrapper.querySelectorAll("div"))
      .find(el => el.getAttribute("style")?.includes("cursor: col-resize"));
    const target = handle || resizeWrapper;

    fireEvent.mouseDown(target, { clientX: 300, clientY: 100 });
    fireEvent.mouseMove(document, { clientX: 350, clientY: 100 });
    fireEvent.mouseUp(document, { clientX: 350, clientY: 100 });

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("pages");
      expect(supabase.from().update).toHaveBeenCalled();
    });

    getUserMock.mockRestore();
  });
  it("logs error when user is not found", async () => {
    const getUserMock = vi.spyOn(supabase.auth, "getUser").mockResolvedValueOnce({
        data: { user: null },
        error: { message: "No user found" },
    });

    render(<ImageNode {...defaultProps} />);

    await waitFor(() => {
        expect(screen.getByText("Failed to fetch user info")).toBeInTheDocument();
    });

    getUserMock.mockRestore();
  });
  it("toggles button visibility on image click when isMobile is true", async () => {
    const { getByTestId, queryByTestId } = render(<ImageNode {...defaultProps} isMobile={true} />);

    expect(queryByTestId("buttons")).toHaveStyle("display: block");

    fireEvent.click(getByTestId("image-node").parentElement!);

    await waitFor(() => {
        expect(queryByTestId("buttons")).not.toHaveStyle("display: none");
    });

    fireEvent.click(document.body);

    await waitFor(() => {
        expect(queryByTestId("buttons")).toHaveStyle("display: block");
    });
  });
  it("falls back to text node on upload error", async () => {
    const mockUpload = uploadImage as unknown as vi.Mock;
    mockUpload.mockRejectedValue(new Error("Upload failed"));

    render(<ImageNode {...defaultProps} />);
    const fileInput = screen.getByTestId("node-image-upload");

    fireEvent.change(fileInput, {
      target: { files: [new File(["fail"], "fail.png", { type: "image/png" })] },
    });

    await waitFor(() => {
      expect(mockChangeNodeValue).toHaveBeenCalledWith(0, "");
    });
  });
  it("calls updateNodeSizeInPage on resize", async () => {
    const getUserMock = vi.spyOn(supabase.auth, "getUser")
    .mockResolvedValue({ data: { user: { id: "user123" } }, error: null });

    render(<ImageNode {...defaultProps} />);

    await waitFor(() => expect(getUserMock).toHaveBeenCalled());

    const resizeWrapper = screen.getByTestId("resize-wrapper");

    const handle = Array.from(resizeWrapper.querySelectorAll("div"))
    .find(el => el.getAttribute("style")?.includes("cursor: col-resize"));

    const target = handle || resizeWrapper;

    fireEvent.mouseDown(target, { clientX: 300, clientY: 100 });
    fireEvent.mouseMove(document, { clientX: 350, clientY: 100 });
    fireEvent.mouseUp(document, { clientX: 350, clientY: 100 });

    await waitFor(() => {
    expect(supabase.from).toHaveBeenCalledWith("pages");
    });

    getUserMock.mockRestore();
  });
  it("removes node on Backspace keydown when not in input", () => {
    render(<ImageNode {...defaultProps} />);
    fireEvent.keyDown(window, { key: "Backspace" });
    expect(mockRemoveNodeByIndex).toHaveBeenCalledWith(0);
  });
  it("activates caption input on Enter or Space key", () => {
    render(<ImageNode {...defaultProps} />);
    const caption = screen.getByTestId("image-caption");

    fireEvent.keyDown(caption, { key: "Enter" });
    expect(screen.getByTestId("caption-input")).toBeInTheDocument();

    render(<ImageNode {...defaultProps} />);
    const caption2 = screen.getByTestId("image-caption");

    fireEvent.keyDown(caption2, { key: " " });
    expect(screen.getByTestId("caption-input")).toBeInTheDocument();
  });
  it("focuses caption input and moves caret to end when editing", async () => {
    render(<ImageNode node={{ id: "node-id", type: "image", value: "img.png", width: 300, height: 200, caption: "abc" }} index={0} />);
    const caption = screen.getByTestId("image-caption");
    fireEvent.click(caption);
    const input = screen.getByTestId("caption-input");
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(input.value.length);
    expect(input.selectionEnd).toBe(input.value.length);
  });
  it("removes node on Backspace if input is not focused", () => {
    render(<ImageNode node={{ id: "node-id", type: "image", value: "img.png", width: 300, height: 200 }} index={0} />);
    fireEvent.keyDown(window, { key: "Backspace" });
    expect(mockRemoveNodeByIndex).toHaveBeenCalledWith(0);
  });
  it("hides buttons when clicking outside on mobile", async () => {
    render(<ImageNode node={{ id: "node-id", type: "image", value: "img.png", width: 300, height: 200 }} index={0} />);
    Object.defineProperty(window, "innerWidth", { writable: true, value: 400 });
    window.dispatchEvent(new Event("resize"));
    const imageNode = screen.getByTestId("image-node");
    fireEvent.click(imageNode);
    const buttons = screen.getByTestId("buttons");
    expect(buttons).toBeInTheDocument();
    fireEvent.click(document.body);
    await waitFor(() => {
      expect(buttons).toHaveStyle("display: none");
    });
  });
  it("shows upload button if imagePath is empty", () => {
    render(<ImageNode node={{ id: "node-id", type: "image", value: "", width: 300, height: 200 }} index={0} />);
    expect(screen.getByText("Upload Image")).toBeInTheDocument();
  });
  it("file input has correct props", () => {
    render(<ImageNode node={{ id: "node-id", type: "image", value: "img.png", width: 300, height: 200 }} index={0} />);
    const fileInput = screen.getByTestId("node-image-upload");
    expect(fileInput).toHaveAttribute("type", "file");
    expect(fileInput).toHaveAttribute("accept", "image/*");
    expect(fileInput).toHaveStyle("display: none");
  });
  it("removes node on Backspace keydown when not in input", () => {
    render(<ImageNode node={{ id: "node-id", type: "image", value: "img.png", width: 300, height: 200 }} index={0} />);
    fireEvent.keyDown(window, { key: "Backspace" });
    expect(mockRemoveNodeByIndex).toHaveBeenCalledWith(0);
  });
  it("hides buttons when clicking outside on mobile", async () => {
    render(<ImageNode node={{ id: "node-id", type: "image", value: "img.png", width: 300, height: 200 }} index={0} />);
    Object.defineProperty(window, "innerWidth", { writable: true, value: 400 });
    window.dispatchEvent(new Event("resize"));
    const imageNode = screen.getByTestId("image-node");
    fireEvent.click(imageNode);
    const buttons = screen.getByTestId("buttons");
    expect(buttons).toBeInTheDocument();
    fireEvent.click(document.body);
    await waitFor(() => {
      expect(buttons).toHaveStyle("display: none");
    });
  });
  it("adjusts caption textarea height when editing", () => {
    render(<ImageNode {...defaultProps} />);
    const caption = screen.getByTestId("image-caption");
    fireEvent.click(caption); // triggers isCaptionEditing=true

    const input = screen.getByTestId("caption-input") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "A long caption\nthat wraps" } });

    expect(input.style.height).toBeDefined();
  });
  it("shows error if uploadImage returns no filePath", async () => {
    const mockUpload = uploadImage as unknown as vi.Mock;
    mockUpload.mockResolvedValue({ filePath: "" });

    render(<ImageNode {...defaultProps} />);
    const input = screen.getByTestId("node-image-upload") as HTMLInputElement;

    fireEvent.change(input, {
      target: { files: [new File(["img"], "img.png", { type: "image/png" })] },
    });

    await waitFor(() => {
      expect(screen.getByText("No file path returned")).toBeInTheDocument();
    });
  });
  it("changes node type to text on upload error", async () => {
    const mockUpload = uploadImage as unknown as vi.Mock;
    mockUpload.mockRejectedValue(new Error("Upload failed"));

    render(<ImageNode {...defaultProps} />);
    const input = screen.getByTestId("node-image-upload") as HTMLInputElement;

    fireEvent.change(input, {
      target: { files: [new File(["fail"], "fail.png", { type: "image/png" })] },
    });

    await waitFor(() => {
      expect(mockChangeNodeType).toHaveBeenCalledWith(0, "text");
    });
  });
  it("calls handleSaveCaption after successful image upload", async () => {
    const mockUpload = uploadImage as unknown as vi.Mock;
    mockUpload.mockResolvedValue({ filePath: "new-path.png" });

    render(<ImageNode {...defaultProps} />);
    const input = screen.getByTestId("node-image-upload") as HTMLInputElement;

    fireEvent.change(input, {
      target: { files: [new File(["img"], "test.png", { type: "image/png" })] },
    });

    await waitFor(() => {
      expect(mockChangeNodeValue).toHaveBeenCalledWith(0, "new-path.png");
    });
  });
  it("clears errorMessage after timeout", () => {
    vi.useFakeTimers();

    render(<ImageNode {...defaultProps} />);
    const setError = screen.getByText("Example caption").closest("div");
    fireEvent.error(setError!);
    vi.advanceTimersByTime(15000);

    vi.useRealTimers();
  });
});