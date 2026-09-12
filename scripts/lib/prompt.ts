import readline from "node:readline";

/** Prompts on stdout and reads one line from stdin, with normal (visible) echo. */
export function promptVisible(promptText: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/** Prompts on stdout and reads one line from stdin without echoing what's typed. */
export function promptHidden(promptText: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const isTTY = stdin.isTTY === true;
    process.stdout.write(promptText);

    let input = "";
    const onData = (chunk: Buffer) => {
      const str = chunk.toString("utf8");
      for (const char of str) {
        switch (char) {
          case "\n":
          case "\r":
            cleanup();
            process.stdout.write("\n");
            resolve(input);
            return;
          case "": // Ctrl-C
            cleanup();
            process.stdout.write("\n");
            process.exit(1);
            return;
          case "": // backspace
          case "\b":
            input = input.slice(0, -1);
            break;
          default:
            input += char;
        }
      }
    };

    function cleanup() {
      stdin.removeListener("data", onData);
      if (isTTY) stdin.setRawMode(false);
      stdin.pause();
    }

    if (isTTY) stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    stdin.on("data", onData);
  });
}

/** Reads a single line of input piped in on stdin (for `--password-stdin`). */
export function readStdinLine(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      resolve(data.split(/\r?\n/)[0] ?? "");
    });
    process.stdin.on("error", reject);
  });
}

/**
 * Resolves the operator's password, matching US-001 §3.2 #5:
 * - `--password-stdin`: read one line from stdin, no confirmation prompt (for scripts/tests).
 * - Otherwise: hidden prompt, entered twice, must match. Retries on mismatch.
 */
export async function getPassword(options: { stdin: boolean }): Promise<string> {
  if (options.stdin) {
    return readStdinLine();
  }

  for (;;) {
    const first = await promptHidden("Password: ");
    const second = await promptHidden("Confirm password: ");
    if (first === second) {
      return first;
    }
    console.error("Passwords did not match. Try again.\n");
  }
}
