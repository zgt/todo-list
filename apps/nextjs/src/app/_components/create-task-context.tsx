"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface CreateTaskContextType {
  isCreating: boolean;
  setIsCreating: (value: boolean) => void;
  /** Optional due date to prefill into the inline create form (e.g. from a calendar day). */
  prefillDueDate?: Date;
  /** Open the inline create form, optionally prefilling its due date. */
  startCreating: (dueDate?: Date) => void;
}

const noop = () => {
  /* default no-op */
};

const CreateTaskContext = createContext<CreateTaskContextType>({
  isCreating: false,
  setIsCreating: noop,
  prefillDueDate: undefined,
  startCreating: noop,
});

export function CreateTaskProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCreating, setIsCreatingState] = useState(false);
  const [prefillDueDate, setPrefillDueDate] = useState<Date | undefined>(
    undefined,
  );

  // Preserves the existing setIsCreating(boolean) contract; clears any prefill
  // whenever the form is closed so stale dates don't leak into the next open.
  const setIsCreating = useCallback((value: boolean) => {
    setIsCreatingState(value);
    if (!value) setPrefillDueDate(undefined);
  }, []);

  const startCreating = useCallback((dueDate?: Date) => {
    setPrefillDueDate(dueDate);
    setIsCreatingState(true);
  }, []);

  const value = useMemo(
    () => ({ isCreating, setIsCreating, prefillDueDate, startCreating }),
    [isCreating, setIsCreating, prefillDueDate, startCreating],
  );

  return (
    <CreateTaskContext.Provider value={value}>
      {children}
    </CreateTaskContext.Provider>
  );
}

export function useCreateTask() {
  return useContext(CreateTaskContext);
}
