(() => {
  // <stdin>
  var Terminal = class {
    constructor() {
      this.input = document.getElementById("terminalInput");
      this.output = document.getElementById("terminalOutput");
      this.currentPath = "/";
      this.commands = {
        "ls": this.listDirectory.bind(this),
        "cd": this.changeDirectory.bind(this),
        "help": this.showHelp.bind(this),
        "clear": this.clearTerminal.bind(this)
      };
      this.setupEventListeners();
    }
    setupEventListeners() {
      this.input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.handleCommand();
        }
      });
    }
    handleCommand() {
      const command = this.input.value.trim();
      this.addToOutput(`$ ${command}`);
      if (command) {
        const [cmd, ...args] = command.split(" ");
        if (this.commands[cmd]) {
          this.commands[cmd](args);
        } else {
          this.addToOutput(`Command not found: ${cmd}. Type 'help' for available commands.`);
        }
      }
      this.input.value = "";
    }
    addToOutput(text) {
      const line = document.createElement("div");
      line.className = "terminal-line";
      line.textContent = text;
      this.output.appendChild(line);
      this.output.scrollTop = this.output.scrollHeight;
    }
    listDirectory() {
      const pages = window.hugoData.pages || [];
      const sections = window.hugoData.sections || [];
      const currentPages = pages.filter((page) => {
        const pagePath = page.URL;
        return pagePath.startsWith(this.currentPath) && pagePath.split("/").length === this.currentPath.split("/").length + 1;
      });
      const currentSections = sections.filter((section) => {
        const sectionPath = section.URL;
        return sectionPath.startsWith(this.currentPath) && sectionPath.split("/").length === this.currentPath.split("/").length + 1;
      });
      currentSections.forEach((section) => {
        const name = section.URL.split("/").pop();
        const dir = document.createElement("div");
        dir.className = "terminal-line directory";
        dir.textContent = `\u{1F4C1} ${name}/`;
        dir.onclick = () => this.changeDirectory([name]);
        this.output.appendChild(dir);
      });
      currentPages.forEach((page) => {
        const name = page.URL.split("/").pop();
        const file = document.createElement("div");
        file.className = "terminal-line file";
        file.textContent = `\u{1F4C4} ${name}`;
        file.onclick = () => window.location.href = page.URL;
        this.output.appendChild(file);
      });
    }
    changeDirectory(args) {
      if (!args.length) {
        this.currentPath = "/";
      } else {
        const target = args[0];
        if (target === "..") {
          const parts = this.currentPath.split("/").filter(Boolean);
          parts.pop();
          this.currentPath = "/" + parts.join("/");
        } else {
          this.currentPath = this.currentPath === "/" ? `/${target}` : `${this.currentPath}/${target}`;
        }
      }
      this.addToOutput(`Current directory: ${this.currentPath}`);
    }
    showHelp() {
      this.addToOutput("Available commands:");
      this.addToOutput("  ls              - List contents of current directory");
      this.addToOutput("  cd [directory]  - Change directory");
      this.addToOutput("  cd ..           - Move up one directory");
      this.addToOutput("  clear           - Clear terminal");
      this.addToOutput("  help            - Show this help message");
    }
    clearTerminal() {
      this.output.innerHTML = "";
      this.addToOutput("Terminal cleared.");
    }
  };
  document.addEventListener("DOMContentLoaded", () => {
    new Terminal();
  });
})();
