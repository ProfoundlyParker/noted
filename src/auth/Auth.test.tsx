import { render, screen, fireEvent } from "@testing-library/react";
import { Auth } from "./Auth";
import { useAuthSession } from "./AuthSessionContext";
import { supabase } from "../supabaseClient";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

vi.mock("./AuthSessionContext", () => ({
  useAuthSession: vi.fn(),
}));

vi.mock("../supabaseClient", () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
    },
  },
}));

const mockedUseAuthSession = useAuthSession as unknown as ReturnType<typeof vi.fn>;
const mockedSignInWithOtp = supabase.auth.signInWithOtp as unknown as ReturnType<typeof vi.fn>;

describe("<Auth />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the login form", () => {
    mockedUseAuthSession.mockReturnValue({ session: null });

    render(<Auth />, { wrapper: MemoryRouter });

    expect(screen.getByPlaceholderText("Your email")).toBeInTheDocument();
    expect(screen.getByText("Send login link")).toBeInTheDocument();
  });

  it("disables button and shows spinner when loading", async () => {
    mockedUseAuthSession.mockReturnValue({ session: null });
    mockedSignInWithOtp.mockResolvedValue({ error: null });

    render(<Auth />, { wrapper: MemoryRouter });

    const input = screen.getByPlaceholderText("Your email");
    const button = screen.getByRole("button", { name: /send login link/i });

    await userEvent.type(input, "test@example.com");
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(await screen.findByText("Sending...")).toBeInTheDocument();
  });

  it("shows success message after successful login", async () => {
    mockedUseAuthSession.mockReturnValue({ session: null });
    mockedSignInWithOtp.mockResolvedValue({ error: null });

    render(<Auth />, { wrapper: MemoryRouter });

    const input = screen.getByPlaceholderText("Your email");
    const button = screen.getByRole("button", { name: /send login link/i });

    await userEvent.type(input, "test@example.com");
    fireEvent.click(button);

    expect(await screen.findByText("Check your email!")).toBeInTheDocument();
  });

    it("shows error message on failure", async () => {
        mockedUseAuthSession.mockReturnValue({ session: null });
        mockedSignInWithOtp.mockRejectedValue(new Error("Invalid email address"));

        render(<Auth />, { wrapper: MemoryRouter });

        const input = screen.getByPlaceholderText("Your email");
        const button = screen.getByRole("button", { name: /send login link/i });

        await userEvent.clear(input);
        await userEvent.type(input, "bad-email@example.com");

        await userEvent.click(button);

        expect(await screen.findByText(/invalid email address/i)).toBeInTheDocument();
    });


  it("redirects to / if session exists", () => {
    mockedUseAuthSession.mockReturnValue({ session: { user: {} } });

    render(<Auth />, { wrapper: MemoryRouter });

    expect(screen.queryByPlaceholderText("Your email")).not.toBeInTheDocument();
  });
  it("throws and shows error if signInWithOtp resolves with an error object", async () => {
    mockedUseAuthSession.mockReturnValue({ session: null });
    mockedSignInWithOtp.mockResolvedValue({ error: { message: "Server error" } });

    render(<Auth />, { wrapper: MemoryRouter });

    const input = screen.getByPlaceholderText("Your email");
    const button = screen.getByRole("button", { name: /send login link/i });

    await userEvent.type(input, "test@example.com");
    await userEvent.click(button);

    expect(await screen.findByText(/server error/i)).toBeInTheDocument();
  });
  it("sets error when caught error is a string", async () => {
    mockedUseAuthSession.mockReturnValue({ session: null });
    mockedSignInWithOtp.mockImplementation(() => {
        throw "String error";
    });

    render(<Auth />, { wrapper: MemoryRouter });

    const input = screen.getByPlaceholderText("Your email");
    const button = screen.getByRole("button", { name: /send login link/i });

    await userEvent.type(input, "test@example.com");
    await userEvent.click(button);

    expect(await screen.findByText(/string error/i)).toBeInTheDocument();
  });
});