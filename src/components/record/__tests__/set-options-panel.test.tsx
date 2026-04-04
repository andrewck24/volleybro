import { Options } from "@/components/record/set-options/panel/options";
import { apiClient } from "@/lib/api/api-client";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockMutate = jest.fn();
const mockRouterPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

const mockRecord = {
  sets: [],
  teams: { home: { players: [] } },
};

jest.mock("@/hooks/use-data", () => ({
  useRecord: () => ({
    record: mockRecord,
    mutate: mockMutate,
  }),
}));

jest.mock("@/lib/api/api-client", () => ({
  apiClient: jest.fn(),
}));

jest.mock("@/lib/api/error-toast", () => ({
  showErrorToast: jest.fn(),
}));

jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

jest.mock("@/lib/redux/hooks", () => ({
  useAppSelector: (selector: (s: unknown) => unknown) =>
    selector({
      lineup: { lineups: [{ substitutes: [], liberos: [] }] },
      record: { setIndex: 0 },
    }),
  useAppDispatch: () => jest.fn(),
}));

jest.mock("@/lib/features/team/hooks/use-replace-position", () => ({
  useReplacePosition: () => ({ hasPairedReplacePosition: true }),
}));

jest.mock(
  "@/components/team/lineup/panel/options/libero-replace",
  () => ({
    LiberoReplaceTrigger: () => null,
    LiberoReplaceDialog: () => null,
  }),
);

jest.mock("react-icons/ri", () => ({
  RiArrowRightLine: () => <span>→</span>,
  RiSaveLine: () => <span>save</span>,
  RiUserLine: () => <span>user</span>,
  RiLoader4Line: () => <span data-testid="spinner">spinner</span>,
}));

const mockApiClient = apiClient as jest.Mock;

describe("Options (set-options panel) submitting state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutate.mockResolvedValue(undefined);
  });

  it("disables submit button and shows spinner while saving", async () => {
    let resolveApi!: (v: unknown) => void;
    mockApiClient.mockReturnValue(
      new Promise((resolve) => {
        resolveApi = resolve;
      }),
    );

    const user = userEvent.setup();
    render(<Options recordId="rec-1" />);

    const btn = screen.getByRole("button", { name: /開始新一局|儲存設定/ });
    expect(btn).toBeEnabled();

    await user.click(btn);

    expect(btn).toBeDisabled();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();

    resolveApi({ sets: [], teams: { home: { players: [] } } });
    await waitFor(() => expect(btn).toBeEnabled());
  });

  it("re-enables button after API error", async () => {
    mockApiClient.mockRejectedValue(new Error("network error"));

    const user = userEvent.setup();
    render(<Options recordId="rec-1" />);

    const btn = screen.getByRole("button", { name: /開始新一局|儲存設定/ });
    await user.click(btn);

    await waitFor(() => expect(btn).toBeEnabled());
  });
});
