import { spawn } from "node:child_process";

const action = process.argv[2] || "dev";
const port = process.env.PORT || "3102";
const isWin = process.platform === "win32";
const bin = isWin ? "next.cmd" : "next";

const child = spawn(bin, [action, "-p", port], {
  stdio: "inherit",
  shell: isWin,
});

child.on("exit", (code, signal) => {
  if (signal) {
    try {
      process.kill(process.pid, signal);
    } catch {
      process.exit(1);
    }
  } else {
    process.exit(code ?? 0);
  }
});
