import { useFormDraft } from "@/hooks/use-form-draft";
import { act, renderHook } from "@testing-library/react";

type TestForm = { name: string; value: string };

describe("useFormDraft", () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    jest
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation((k) => storage[k] ?? null);
    jest.spyOn(Storage.prototype, "setItem").mockImplementation((k, v) => {
      storage[k] = v;
    });
    jest.spyOn(Storage.prototype, "removeItem").mockImplementation((k) => {
      delete storage[k];
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("initializes form with sessionStorage draft when key exists", () => {
    const saved: TestForm = { name: "saved-name", value: "saved-value" };
    storage["draft:team:t1"] = JSON.stringify(saved);

    const { result } = renderHook(() =>
      useFormDraft<TestForm>("draft:team:t1"),
    );

    expect(result.current.form.getValues()).toEqual(saved);
  });

  it("initializes form with provided defaultValues when no draft exists", () => {
    const defaults: TestForm = { name: "default-name", value: "" };

    const { result } = renderHook(() =>
      useFormDraft<TestForm>("draft:team:new", { defaultValues: defaults }),
    );

    expect(result.current.form.getValues()).toEqual(defaults);
  });

  it("writes form values to sessionStorage once the form is dirty", async () => {
    const { result } = renderHook(() =>
      useFormDraft<TestForm>("draft:team:t1"),
    );

    await act(async () => {
      result.current.form.setValue("name", "new-name", { shouldDirty: true });
    });

    const stored = JSON.parse(storage["draft:team:t1"] ?? "null");
    expect(stored).toMatchObject({ name: "new-name" });
  });

  it("does not persist a draft while the form stays pristine", () => {
    const defaults: TestForm = { name: "default-name", value: "" };

    // renderHook flushes the initial render and effects inside its own act(),
    // so the persistence effect has already run by the time it returns.
    renderHook(() =>
      useFormDraft<TestForm>("draft:team:new", { defaultValues: defaults }),
    );

    expect(storage["draft:team:new"]).toBeUndefined();
  });

  it("clears draft from sessionStorage on clearDraft", () => {
    storage["draft:team:t1"] = JSON.stringify({
      name: "hello",
      value: "world",
    });

    const { result } = renderHook(() =>
      useFormDraft<TestForm>("draft:team:t1"),
    );

    result.current.clearDraft();

    expect(storage["draft:team:t1"]).toBeUndefined();
  });

  it("uses draft:player:new:t1 key format for player create", () => {
    const saved = { name: "player-name", value: "" };
    storage["draft:player:new:t1"] = JSON.stringify(saved);

    const { result } = renderHook(() =>
      useFormDraft<TestForm>("draft:player:new:t1"),
    );

    expect(result.current.form.getValues()).toEqual(saved);
  });
});
