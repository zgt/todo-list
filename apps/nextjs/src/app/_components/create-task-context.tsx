"use client";

import { createContext, useContext, useState } from "react";

interface CreateTaskContextType {
  isCreating: boolean;
  setIsCreating: (value: boolean) => void;
}

const noop = () => {
  /* default no-op */
};

const CreateTaskContext = createContext<CreateTaskContextType>({
  isCreating: false,
  setIsCreating: noop,
});

export function CreateTaskProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCreating, setIsCreating] = useState(false);
  return (
    <CreateTaskContext.Provider value={{ isCreating, setIsCreating }}>
      {children}
    </CreateTaskContext.Provider>
  );
}

export function useCreateTask() {
  return useContext(CreateTaskContext);
}
