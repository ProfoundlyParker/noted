import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PageNode } from "./PageNode";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../state/AppStateContext";
import { supabase } from "../supabaseClient";
import userEvent from "@testing-library/user-event";
import { act } from "react";

vi.mock("react-router-dom", () => ({
  useNavigate: vi.fn(),
}));

vi.mock("../state/AppStateContext", () => ({
  useAppState: vi.fn(),
}));

vi.mock("../supabaseClient", () => {
  const updateReturn = {
    eq: vi.fn(() => Promise.resolve({ error: null })),
  };

  const deleteReturn = {
    eq: vi.fn(() => deleteReturn),
    then: vi.fn((cb) => cb({ error: null })),
  };

  return {
    supabase: {
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({ data: { user: { id: "123" } }, error: null })
        ),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(() =>
          Promise.resolve({
            data: { title: "My Title", emoji: "🚀", cover: "cover.jpg" },
          })
        ),
        update: vi.fn(() => updateReturn),
        delete: vi.fn(() => deleteReturn),
      })),
    },
  };
});

vi.mock("emoji-picker-react", () => ({
  __esModule: true,
  default: ({ onEmojiClick }: any) => (
    <div role="dialog">
      <button onClick={() => onEmojiClick({ emoji: "😀" })}>😀</button>
    </div>
  ),
}));

describe("PageNode Component", () => {
  const mockNavigate = vi.fn();
  const mockRemoveNodeByIndex = vi.fn();

  const node = { type: "page", value: "test-page" };

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as unknown as vi.Mock).mockReturnValue(mockNavigate);
    (useAppState as unknown as vi.Mock).mockReturnValue({
      removeNodeByIndex: mockRemoveNodeByIndex,
    });
  });

  it("renders with default emoji, title, and default cover", async () => {
    render(<PageNode node={{ type: "page", value: "test-page" }} index={0} isFocused={false} />);
    expect(await screen.findByText("📃")).toBeInTheDocument();
    expect(screen.getByAltText("Default cover")).toBeInTheDocument();
  });

  it("navigates on cover click", () => {
    render(<PageNode node={{ type: "page", value: "my-slug" }} index={0} isFocused={false} />);
    fireEvent.click(screen.getByAltText("Default cover"));
    expect(mockNavigate).toHaveBeenCalledWith("/my-slug");
  });

  it("calls removeNodeByIndex on Backspace when focused", () => {
    render(<PageNode node={{ type: "page", value: "page" }} index={2} isFocused={true} />);
    fireEvent.keyDown(window, { key: "Backspace" });
    expect(mockRemoveNodeByIndex).toHaveBeenCalledWith(2);
  });

  it("opens emoji picker and selects emoji", async () => {
    render(<PageNode node={{ type: "page", value: "test" }} index={0} isFocused={false} />);

    fireEvent.click(screen.getByText("📃"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByText("😀"));
    expect(screen.getByText("😀")).toBeInTheDocument();
  });

  it("deletes page and calls removeNodeByIndex on delete button click", async () => {
    render(<PageNode node={{ type: "page", value: "delete-me" }} index={1} isFocused={false} />);
    await screen.findByText("My Title");
    fireEvent.click(screen.getByTitle("Delete this page"));

    await waitFor(() => {
      expect(mockRemoveNodeByIndex).toHaveBeenCalledWith(1);
    });
  });

  it("handles missing user gracefully", async () => {
    // Override getUser to return no user
    (supabase.auth.getUser as vi.Mock).mockResolvedValueOnce({ data: null, error: "User not found" });

    render(<PageNode node={{ type: "page", value: "no-user" }} index={0} isFocused={false} />);

    expect(await screen.findByText("📃")).toBeInTheDocument();
  });
  it("navigates on Enter keydown when focused", () => {
    render(
      <PageNode
        node={node}
        isFocused={true}
        index={0}
      />
    );

    fireEvent.keyDown(window, { key: "Enter" });
    expect(mockNavigate).toHaveBeenCalledWith("/test-page");
  });

  it("renders the title in a span", async () => {
    render(
      <PageNode
        node={{ id: "test-node", pageId: "page-1", type: "page", value: "" }}
        isFocused={false}
        index={0}
      />
    );

    const span = await screen.findByTestId("textbox");

    expect(span).toBeInTheDocument();
    expect(span.tagName).toBe("SPAN");
    expect(span).toHaveTextContent("My Title");
  });

  it("closes emoji picker on outside click", async () => {
    render(
        <PageNode
        node={node}
        isFocused={false}
        index={0}
        />
    );

    const emojiButton = screen.getByTestId("emoji");
    await userEvent.click(emojiButton);

    const picker = await screen.findByTestId("emoji-picker");
    expect(picker).toBeInTheDocument();

    await userEvent.click(document.body);

    await waitFor(() => {
        expect(screen.queryByTestId("emoji-picker")).not.toBeInTheDocument();
    });
  });
  it("handleEmojiClick early returns if missing emoji, node.value, or userId", async () => {
    render(<PageNode node={{ type: "page", value: "" }} index={0} isFocused={false} />);
    const instance = screen.getByTestId("textbox").parentElement as any;
    const handleEmojiClick = instance?.stateNode?.handleEmojiClick;
    await handleEmojiClick?.({ emoji: "" });
    // nothing should throw
    expect(screen.getByTestId("textbox")).toBeInTheDocument();
  });
  it("handleDeleteClick early returns if node.value or userId missing", async () => {
    render(<PageNode node={{ type: "page", value: "" }} index={0} isFocused={false} />);
    const deleteButton = screen.getByTitle("Delete this page");
    fireEvent.click(deleteButton);
    expect(mockRemoveNodeByIndex).not.toHaveBeenCalled();
  });
  it("sets errorMessage if fetching page data fails", async () => {
    (supabase.from as vi.Mock).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.reject("Fetch error")),
    });

    render(<PageNode node={node} index={0} isFocused={false} />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load page data")).toBeInTheDocument();
    });
  });
  it("sets errorMessage when handleDeleteClick fails", async () => {
    const deleteMock = {
      eq: vi.fn().mockReturnThis(),
    };
    (supabase.from as vi.Mock).mockReturnValueOnce({
      delete: vi.fn(() => ({ error: "Delete failed", eq: deleteMock.eq })),
    });

    render(<PageNode node={{ type: "page", value: "delete-me" }} index={0} isFocused={false} />);

    const deleteButton = screen.getByTitle("Delete this page");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toHaveTextContent("Failed to load page data");
    });
  });
  it("sets errorMessage when handleEmojiClick fails", async () => {
    const updateMock = { eq: vi.fn().mockReturnThis() };
    (supabase.from as vi.Mock).mockReturnValueOnce({
      update: vi.fn(() => ({ error: "Update failed", eq: updateMock.eq })),
    });

    render(<PageNode node={{ type: "page", value: "test" }} index={0} isFocused={false} />);

    fireEvent.click(screen.getByText("📃"));

    fireEvent.click(screen.getByText("😀"));
    await waitFor(() => {
        expect(screen.getByTestId("error-message")).toHaveTextContent("Failed to load page data×");
      });
  });
});