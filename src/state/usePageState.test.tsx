/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePageState } from "./usePageState";
import { createPage } from "../utils/createPage";
import { vi } from "vitest";
import { supabase } from "../supabaseClient";
import { produce } from "immer";

let syncedState: any;
let setSyncedState: any;

vi.mock("./useSyncedState", async () => {
  return {
    useSyncedState: vi.fn((initial) => {
      if (!syncedState) syncedState = { ...initial };
      setSyncedState = vi.fn((updater) => {
        syncedState =
          typeof updater === "function"
            ? produce(syncedState, updater) // Immer-style draft mutation support
            : updater;
      });
      return [syncedState, setSyncedState];
    }),
  };
});

beforeEach(() => {
  syncedState = undefined;
  setSyncedState = undefined;
  vi.clearAllMocks();
});

vi.mock("../utils/createPage", () => ({
  createPage: vi.fn(),
}));

const mockSetPage = vi.fn();

describe("usePageState", () => {
  const initialState = { nodes: [
    { id: "node-0", type: "text", value: "", emoji: "" }
  ], title: "Initial Title", cover: "Initial Cover" };

  it("adds a node", () => {
    const { result } = renderHook(() => usePageState(initialState));

    act(() => {
      result.current.addNode({ id: "node-1", type: "text", value: "Hello" }, 0);
    });

    expect(setSyncedState).toHaveBeenCalledWith(expect.any(Function));
  });

  it("removes a node by index", () => {
    const { result } = renderHook(() => usePageState(initialState));

    act(() => {
      result.current.removeNodeByIndex(0);
    });

    expect(setSyncedState).toHaveBeenCalledWith(expect.any(Function));
  });

  it("changes node value", () => {
    const { result } = renderHook(() => usePageState(initialState));

    act(() => {
      result.current.changeNodeValue(0, "Updated Value");
    });

    expect(setSyncedState).toHaveBeenCalledWith(expect.any(Function));
  });

  it("changes node type to page and sets new slug", async () => {
    (createPage as any).mockResolvedValue({ slug: "new-slug" });

    const { result } = renderHook(() => usePageState(initialState));

    await act(async () => {
      await result.current.changeNodeType(0, "page");
    });

    expect(setSyncedState).toHaveBeenCalled();
  });

  it("sets nodes", () => {
    const { result } = renderHook(() => usePageState(initialState));

    act(() => {
      result.current.setNodes([{ id: "a", value: "a", type: "text" }]);
    });

    expect(setSyncedState).toHaveBeenCalled();
  });

  it("sets title", () => {
    const { result } = renderHook(() => usePageState(initialState));

    act(() => {
      result.current.setTitle("New Title");
    });

    expect(setSyncedState).toHaveBeenCalled();
  });

  it("sets cover image", () => {
    const { result } = renderHook(() => usePageState(initialState));

    act(() => {
      result.current.setCoverImage("/new-cover.png");
    });

    expect(setSyncedState).toHaveBeenCalled();
  });

  it("reorders nodes", () => {
    const nodes = [
      { id: "a", type: "text", value: "1" },
      { id: "b", type: "text", value: "2" },
    ];

    const { result } = renderHook(() => usePageState(initialState));

    act(() => {
      result.current.reorderNodes("a", "b");
    });

    expect(setSyncedState).toHaveBeenCalled();
  });

  it("returns expected state shape", () => {
    const { result } = renderHook(() => usePageState(initialState));

    expect(result.current).toMatchObject({
      nodes: initialState.nodes,
      title: "Initial Title",
      cover: "Initial Cover",
      addNode: expect.any(Function),
      removeNodeByIndex: expect.any(Function),
      changeNodeType: expect.any(Function),
      changeNodeValue: expect.any(Function),
      setTitle: expect.any(Function),
      setCoverImage: expect.any(Function),
      setNodes: expect.any(Function),
      reorderNodes: expect.any(Function),
      setEmoji: expect.any(Function),
      updateNodeCaptionInDatabase: expect.any(Function),
      isCommandPanelOpen: false,
      setIsCommandPanelOpen: expect.any(Function),
    });
  });
  it("fetches user ID on mount", async () => {
    const getUserMock = vi.fn().mockResolvedValue({
        data: { user: { id: "123" } },
        error: null,
    });

    vi.spyOn(supabase.auth, "getUser").mockImplementation(getUserMock);

    renderHook(() => usePageState(initialState));

    await waitFor(() => {
        expect(getUserMock).toHaveBeenCalled();
    });
  });
    it("logs error when setEmoji receives node with no ID", async () => {
        const nodes = [{ id: "", type: "text", value: "", emoji: "" }];
        const initialTestState = { ...initialState, nodes };

        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const { result } = renderHook(() => usePageState(initialTestState));

        await act(async () => {
            await result.current.setEmoji(0, "🔥");
        });

        expect(errorSpy).toHaveBeenCalledWith("Invalid node ID:", "");

        errorSpy.mockRestore();
    });

    it("logs error when updateNodeCaptionInDatabase fails", async () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        vi.spyOn(supabase, "from").mockReturnValue({
            update: () => ({
            eq: () => ({
                eq: () => ({ error: { message: "fail", details: "something went wrong" } }),
            }),
            }),
        } as any);

        const { result } = renderHook(() => usePageState(initialState));

        await act(async () => {
            await result.current.updateNodeCaptionInDatabase("abc", "new caption");
        });

        expect(errorSpy).toHaveBeenCalledWith(
            "Error updating caption:",
            "fail",
            "something went wrong"
        );

        errorSpy.mockRestore();
    });
    it("sets isCommandPanelOpen", () => {
        const { result } = renderHook(() => usePageState(initialState));

        act(() => {
            result.current.setIsCommandPanelOpen(true);
        });

        expect(result.current.isCommandPanelOpen).toBe(true);
    });
    it("updates the node value with changeNodeValue", () => {
        const { result, rerender } = renderHook(() => usePageState(initialState));

        act(() => {
            result.current.changeNodeValue(0, "Updated Value");
        });

        rerender();

        expect(result.current.nodes[0].value).toBe("Updated Value");
    });
    it("updates node type to 'page' and sets value to newPage.slug", async () => {
        const mockPage = { slug: "test-slug" };
        vi.mocked(createPage).mockResolvedValueOnce(mockPage);

        const { result } = renderHook(() => usePageState(initialState));

        await act(async () => {
            await result.current.changeNodeType(0, "page");
        });

        expect(result.current.nodes[0].type).toBe("page");
        expect(result.current.nodes[0].value).toBe("test-slug");
    });

    it("updates node type to something else and clears value", async () => {
        const { result } = renderHook(() => usePageState(initialState));

        await act(async () => {
            await result.current.changeNodeType(0, "text");
        });

        expect(result.current.nodes[0].type).toBe("text");
        expect(result.current.nodes[0].value).toBe("");
    });
    it("sets nodes with setNodes", () => {
        const newNodes = [{ ...initialState.nodes[0], id: "n2" }];
        const { result, rerender } = renderHook(() => usePageState(initialState));

        act(() => {
            result.current.setNodes(newNodes);
        });

        rerender();

        expect(result.current.nodes).toEqual(newNodes);
    });

    it("sets title with setTitle", () => {
        const { result, rerender } = renderHook(() => usePageState(initialState));

        act(() => {
            result.current.setTitle("New Title");
        });

        rerender();

        expect(result.current.title).toBe("New Title");
    });

    it("sets cover image with setCoverImage", () => {
        const { result, rerender } = renderHook(() => usePageState(initialState));

        act(() => {
            result.current.setCoverImage("new-cover.png");
        });

        rerender();

        expect(result.current.cover).toBe("new-cover.png");
    });
    it("reorders nodes with reorderNodes", () => {
        const nodes = [
            { ...initialState.nodes[0], id: "a" },
            { ...initialState.nodes[0], id: "b" }
        ];

        const { result, rerender } = renderHook(() =>
            usePageState({ ...initialState, nodes })
        );

        act(() => {
            result.current.reorderNodes("a", "b");
        });

        rerender();

        expect(result.current.nodes.map(n => n.id)).toEqual(["b", "a"]);
    });
    it("sets emoji and calls updateNodeEmoji", async () => {
        const { result } = renderHook(() => usePageState(initialState));

        await act(async () => {
            await result.current.setEmoji(0, "🔥");
        });

        expect(result.current.nodes[0].emoji).toBe("🔥");
    });

    it("logs error if node ID is missing in setEmoji", async () => {
        const badState = {
            ...initialState,
            nodes: [{ ...initialState.nodes[0], id: "" }]
        };

        const { result } = renderHook(() => usePageState(badState));
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        await act(async () => {
            await result.current.setEmoji(0, "😬");
        });

        expect(consoleSpy).toHaveBeenCalledWith(
            "Invalid node ID:",
            ""
        );

        consoleSpy.mockRestore();
    });
});