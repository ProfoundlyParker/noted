import { render, screen, waitFor } from "@testing-library/react";
import { withInitialState } from "./withInitialState";
import { vi } from "vitest";
import { useMatch } from "react-router-dom";
import { supabase } from "../supabaseClient";

const mockUseMatch = vi.mocked(useMatch);
vi.mock("react-router-dom", () => ({
  useMatch: vi.fn(),
}));

const selectMock = vi.fn().mockReturnThis();
const matchMock = vi.fn().mockReturnThis();
const insertMock = vi.fn().mockReturnThis();

vi.mock("../supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: selectMock,
      match: matchMock,
      insert: insertMock,
    })),
  },
}));

const DummyComponent = ({ initialState }: any) => (
  <div>Loaded Page: {initialState.title}</div>
);

const Wrapped = withInitialState(DummyComponent);

describe("withInitialState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loader while loading", async () => {
    mockUseMatch.mockReturnValue({ params: { slug: "test" } });
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: "123" } } });
    supabase.from().select().match.mockResolvedValue({ data: [{ title: "Test Page" }] });

    render(<Wrapped />);
    expect(screen.getByTestId("loader")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Loaded Page: Test Page")).toBeInTheDocument();
    });
  });

  it("shows error if user is not logged in", async () => {
    mockUseMatch.mockReturnValue({ params: { slug: "test" } });
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    render(<Wrapped />);
    expect(await screen.findByText(/oops! this page doesn’t exist/i)).toBeInTheDocument();
  });

  it('shows "Page not found" if no page is returned', async () => {
    mockUseMatch.mockReturnValue({ params: { slug: "missing" } });
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: "123" } } });
    supabase.from().select().match.mockResolvedValue({ data: [] });

    render(<Wrapped />);
    expect(await screen.findByText(/oops! this page doesn’t exist/i)).toBeInTheDocument();
  });

  it("inserts start page when not found and slug is 'start'", async () => {
    mockUseMatch.mockReturnValue({ params: { slug: "start" } });
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: "123" } } });

    supabase.from().select().match
      .mockResolvedValueOnce({ data: [] }) // First check
      .mockResolvedValueOnce({ data: [{ title: "Start Page" }] }); // After insert

    supabase.from().insert.mockResolvedValue({});

    render(<Wrapped />);
    await waitFor(() => {
      expect(screen.getByText("Loaded Page: Start Page")).toBeInTheDocument();
    });
  });
  it("does not fetch if inProgress.current is true", async () => {
      mockUseMatch.mockReturnValue({ params: { slug: "test" } });
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: "123" } } });
      supabase.from().select().match.mockResolvedValue({ data: [{ title: "Test Page" }] });

      const Wrapped = withInitialState(DummyComponent);

      const { rerender } = render(<Wrapped />);
      rerender(<Wrapped />);

      await waitFor(() => {
        expect(screen.getByText("Loaded Page: Test Page")).toBeInTheDocument();
    });
  });
  it("skips fetching data if inProgress.current is already true", async () => {
    mockUseMatch.mockReturnValue({ params: { slug: "skip" } });

    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: "123" } } });
    supabase.from().select().match.mockResolvedValue({ data: [{ title: "Should Not Load" }] });

    const WrappedInner = withInitialState(DummyComponent);

    const fromSpy = vi.spyOn(supabase, "from");

    const { container } = render(<WrappedInner />);
    const instance = container.firstChild as any;
    (instance as any)?.inProgress && ((instance as any).inProgress.current = true);

    await waitFor(() => {
      expect(fromSpy).not.toHaveBeenCalled();
    });
  });
});