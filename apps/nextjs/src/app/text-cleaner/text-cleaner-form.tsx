"use client";

import { useMemo, useState } from "react";
import { Check, Clipboard, Eraser, WandSparkles } from "lucide-react";

import { Button } from "@acme/ui/button";
import { Textarea } from "@acme/ui/textarea";

type CopyStatus = "idle" | "copied" | "manual" | "empty";

function cleanEmailText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n+$/g, "");
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function TextCleanerForm() {
  const [inputText, setInputText] = useState("");
  const [cleanedText, setCleanedText] = useState("");
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

  const stats = useMemo(() => {
    const normalized = inputText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = normalized.length > 0 ? normalized.split("\n") : [];
    const linesWithTrailingWhitespace = lines.filter(
      (line) => line !== line.trimEnd(),
    ).length;

    return {
      lineCount: lines.length,
      linesWithTrailingWhitespace,
    };
  }, [inputText]);

  async function handleClean() {
    const cleaned = cleanEmailText(inputText);
    setCleanedText(cleaned);

    if (!cleaned) {
      setCopyStatus("empty");
      return;
    }

    const copied = await copyToClipboard(cleaned);
    setCopyStatus(copied ? "copied" : "manual");
  }

  async function handleCopy() {
    if (!cleanedText) {
      setCopyStatus("empty");
      return;
    }

    const copied = await copyToClipboard(cleanedText);
    setCopyStatus(copied ? "copied" : "manual");
  }

  function handleClear() {
    setInputText("");
    setCleanedText("");
    setCopyStatus("idle");
  }

  return (
    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-0 pb-1 sm:px-2 sm:pt-2 sm:pr-4 sm:pb-2">
      <div className="mx-auto grid w-full max-w-6xl gap-4 sm:gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#164B49] bg-[#102A2A]/80 p-4 backdrop-blur-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div>
              <label
                htmlFor="text-cleaner-input"
                className="text-lg font-bold text-white sm:text-xl"
              >
                Paste text here
              </label>
              <p className="text-muted-foreground mt-1 text-sm">
                Keep paragraph breaks; clean only the invisible trailing spaces.
              </p>
            </div>
            <div className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[#8FA8A8] sm:block sm:w-auto sm:shrink-0 sm:text-right">
              <div>{stats.lineCount} lines</div>
              <div>{stats.linesWithTrailingWhitespace} dirty lines</div>
            </div>
          </div>

          <Textarea
            id="text-cleaner-input"
            value={inputText}
            onChange={(event) => {
              setInputText(event.target.value);
              setCopyStatus("idle");
            }}
            placeholder="Paste the email text here..."
            className="min-h-[220px] resize-y rounded-xl border-[#164B49] bg-[#0A1A1A] text-sm text-[#DCE4E4] placeholder:text-[#8FA8A8] focus-visible:border-[#21716C] sm:min-h-[360px] sm:text-base"
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              onClick={handleClean}
              className="bg-primary hover:bg-primary/90 w-full text-black sm:w-auto"
            >
              <WandSparkles className="mr-2 size-4" />
              Clean & Copy
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              className="w-full border-[#164B49] bg-transparent text-[#DCE4E4] hover:bg-white/5 sm:w-auto"
            >
              <Eraser className="mr-2 size-4" />
              Clear
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-[#164B49] bg-[#102A2A]/80 p-4 backdrop-blur-sm sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-4 sm:mb-6">
            <div>
              <label
                htmlFor="text-cleaner-output"
                className="text-lg font-bold text-white sm:text-xl"
              >
                Cleaned text
              </label>
              <p className="text-muted-foreground mt-1 text-sm">
                This preserves blank lines and removes end-of-line formatting.
              </p>
            </div>
          </div>

          <Textarea
            id="text-cleaner-output"
            value={cleanedText}
            readOnly
            placeholder="Cleaned text will appear here..."
            className="min-h-[220px] resize-y rounded-xl border-[#164B49] bg-[#0A1A1A] text-sm text-[#DCE4E4] placeholder:text-[#8FA8A8] focus-visible:border-[#21716C] sm:min-h-[360px] sm:text-base"
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              disabled={!cleanedText}
              className="w-full border-[#164B49] bg-transparent text-[#DCE4E4] hover:bg-white/5 disabled:opacity-50 sm:w-auto"
            >
              <Clipboard className="mr-2 size-4" />
              Copy cleaned text
            </Button>

            {copyStatus === "copied" && (
              <p className="flex items-center text-sm font-medium text-[#50C878]">
                <Check className="mr-1 size-4" />
                Cleaned and copied to clipboard.
              </p>
            )}
            {copyStatus === "manual" && (
              <p className="text-sm text-amber-200">
                Cleaned text is ready. Browser clipboard access was blocked, so
                copy it manually.
              </p>
            )}
            {copyStatus === "empty" && (
              <p className="text-sm text-amber-200">
                Paste some text first, then clean it.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
