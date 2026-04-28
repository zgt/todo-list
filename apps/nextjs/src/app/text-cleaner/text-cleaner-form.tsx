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
    <div className="custom-scrollbar flex-1 overflow-y-auto px-2 pt-2 pr-4 pb-2">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#164B49] bg-[#102A2A]/80 p-5 backdrop-blur-sm">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <label
                htmlFor="text-cleaner-input"
                className="text-lg font-semibold text-white"
              >
                Paste text here
              </label>
              <p className="text-muted-foreground mt-1 text-sm">
                Keep paragraph breaks; clean only the invisible trailing spaces.
              </p>
            </div>
            <div className="text-muted-foreground shrink-0 text-right text-xs">
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
            className="min-h-[360px] resize-y rounded-xl border-[#164B49] bg-[#0A1A1A]/60 text-[#DCE4E4] placeholder:text-[#8FA8A8] focus-visible:border-[#50C878]"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={handleClean}
              className="bg-[#50C878] text-[#071313] hover:bg-[#6EE08F]"
            >
              <WandSparkles className="mr-2 size-4" />
              Clean & Copy
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              className="border-[#164B49] bg-transparent text-[#DCE4E4] hover:bg-white/5"
            >
              <Eraser className="mr-2 size-4" />
              Clear
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-[#164B49] bg-[#102A2A]/80 p-5 backdrop-blur-sm">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <label
                htmlFor="text-cleaner-output"
                className="text-lg font-semibold text-white"
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
            className="min-h-[360px] resize-y rounded-xl border-[#164B49] bg-[#0A1A1A]/60 text-[#DCE4E4] placeholder:text-[#8FA8A8] focus-visible:border-[#50C878]"
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              disabled={!cleanedText}
              className="border-[#164B49] bg-transparent text-[#DCE4E4] hover:bg-white/5 disabled:opacity-50"
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
